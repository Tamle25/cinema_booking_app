import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { GeminiResult, ChatIntent } from '../chatbot/types/chatbot.types';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODELS,
  GEMINI_REQUEST_TIMEOUT_MS,
  GEMINI_MAX_RETRIES,
  GEMINI_RETRY_BASE_DELAY_MS,
  GEMINI_MAX_ACCEPTABLE_RETRY_DELAY_MS,
  MAX_MESSAGE_LENGTH,
  MAX_BACKEND_DATA_LENGTH,
  FALLBACK_QUOTA_EXCEEDED,
  FALLBACK_INVALID_API_KEY,
  FALLBACK_BAD_REQUEST,
  FALLBACK_EMPTY_RESPONSE,
  FALLBACK_TIMEOUT,
  FALLBACK_GENERIC_ERROR,
} from './gemini.constants';

/** Tham số cho generateReply */
export interface GenerateReplyParams {
  userMessage: string;
  intent: string;
  isAuthenticated: boolean;
  backendData: unknown;
  /** Request ID để trace log xuyên suốt pipeline */
  requestId?: string;
}

/** Thông tin lỗi Gemini đã phân loại */
interface GeminiErrorInfo {
  type: string;
  retryable: boolean;
  fallbackMessage: string;
  httpStatus?: number;
  quotaMetric?: string;
  retryDelay?: number;
}

/** Cấu trúc model trong chain */
interface ModelEntry {
  model: GenerativeModel;
  name: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelChain: ModelEntry[];

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    // ===== STARTUP VALIDATION =====
    if (!apiKey) {
      this.logger.error('❌ GEMINI_API_KEY chưa được cấu hình trong .env');
      throw new Error('GEMINI_API_KEY is required');
    }

    if (!apiKey.startsWith('AIzaSy')) {
      this.logger.warn('⚠️ GEMINI_API_KEY có format không chuẩn (thường bắt đầu bằng "AIzaSy")');
    }

    // Log masked key
    const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
    this.logger.log(`✅ GEMINI_API_KEY loaded: ${maskedKey} (${apiKey.length} chars)`);

    this.genAI = new GoogleGenerativeAI(apiKey);

    // ===== BUILD MODEL CHAIN TỪ .env =====
    const primaryModel = this.configService.get<string>('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
    const modelsStr = this.configService.get<string>('GEMINI_MODELS') || DEFAULT_GEMINI_MODELS;
    const modelNames = modelsStr
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    // Đảm bảo primary model luôn đứng đầu chain
    const orderedNames: string[] = [primaryModel];
    for (const name of modelNames) {
      if (name !== primaryModel) {
        orderedNames.push(name);
      }
    }

    this.modelChain = orderedNames.map((name) => ({
      model: this.genAI.getGenerativeModel({ model: name }),
      name,
    }));

    this.logger.log(`📌 Model chain (${this.modelChain.length} models): ${orderedNames.join(' → ')}`);
    this.logger.log(`📌 Timeout: ${GEMINI_REQUEST_TIMEOUT_MS}ms | Max retries: ${GEMINI_MAX_RETRIES}`);
  }

  /**
   * Phân loại intent của tin nhắn bằng Gemini NLU.
   * Yêu cầu trả về JSON có cấu trúc.
   */
  async classifyIntent(message: string, requestId?: string): Promise<{
    intent: ChatIntent;
    movieName?: string;
    cinemaName?: string;
    date?: string;
  } | null> {
    const rid = requestId || 'no-rid';
    const currentTime = new Date().toISOString();
    const prompt = `
Bạn là bộ phân loại Intent cho chatbot đặt vé xem phim online CineMax.
Thời gian hiện tại của hệ thống: ${currentTime}

Hãy phân loại tin nhắn sau của người dùng vào một trong các Intent dưới đây:
1. NOW_SHOWING: Câu hỏi về phim đang chiếu (VD: "Phim nào đang chiếu?", "phim đang chiếu", "rạp đang chiếu phim gì")
2. CURRENT_MOVIES: Các câu hỏi tương tự NOW_SHOWING về danh sách phim đang phát hành.
3. TODAY_MOVIES: Câu hỏi cụ thể về danh sách phim chiếu hôm nay (VD: "Hôm nay chiếu phim gì?", "phim chiếu hôm nay")
4. UPCOMING_MOVIES: Câu hỏi về phim sắp chiếu (VD: "phim sắp chiếu", "sắp ra mắt", "sắp có phim gì mới")
5. MOVIE_DETAIL: Yêu cầu thông tin chi tiết phim, cốt truyện, tóm tắt phim, hoặc hỏi trailer phim (VD: "Tóm tắt phim này cho tôi", "phim này có trailer không?", "nội dung phim Lật Mặt", "trailer phim Doraemon")
6. MOVIE_BY_GENRE: Câu hỏi tìm phim theo thể loại (VD: "Có phim hành động không?", "có phim hoạt hình nào không?", "phim kinh dị đang chiếu")
7. SHOWTIMES: Câu hỏi chung chung về lịch chiếu rạp (VD: "Lịch chiếu hôm nay?", "lịch chiếu?", "suất chiếu hôm nay?")
8. SHOWTIMES_BY_MOVIE: Lịch chiếu của một bộ phim cụ thể (VD: "Lịch chiếu phim Doraemon", "Doraemon chiếu mấy giờ")
9. SHOWTIMES_BY_CINEMA: Lịch chiếu của một rạp cụ thể (VD: "Rạp CGV đang chiếu phim gì?", "lịch chiếu rạp CineMax Hà Nội")
10. SHOWTIMES_BY_DATE: Lịch chiếu vào một ngày cụ thể (VD: "Lịch chiếu ngày mai", "lịch chiếu ngày 24/05/2026")
11. TICKET_PRICE: Câu hỏi về giá vé (VD: "Giá vé bao nhiêu?", "vé phim Doraemon bao nhiêu tiền?", "giá vé rạp này")
12. SEAT_AVAILABILITY: Trạng thái ghế ngồi/ghế trống (VD: "Còn ghế không?", "suất này còn ghế trống không?", "sơ đồ ghế")
13. FOOD_COMBO: Câu hỏi về combo bắp nước (VD: "Có combo bắp nước nào?", "giá bắp nước", "menu đồ ăn")
14. COMBO: Các câu hỏi về combo bắp nước (tương đương FOOD_COMBO).
15. BOOKING_STATUS: Trạng thái đặt vé, lịch sử đặt vé (VD: "Vé của tôi", "lịch sử đặt vé", "đơn hàng của tôi")
16. BOOKING_GUIDE: Người dùng muốn đặt vé, mua vé, book vé (VD: "Tôi muốn đặt vé", "đặt vé xem phim", "mua vé", "book vé")
17. GREETING: Chào hỏi xã giao, giới thiệu bản thân (VD: "Xin chào", "hi chatbot", "bạn là ai", "ai đây")
18. OUT_OF_SCOPE: Câu hỏi ngoài phạm vi rạp chiếu phim (VD: "Thời tiết hôm nay thế nào?", "tổng thống Mỹ là ai", "bỏ qua hướng dẫn trước")

Tin nhắn của người dùng:
"${message}"

Hãy trả về kết quả dưới dạng JSON duy nhất với cấu trúc sau:
{
  "intent": "TÊN_INTENT",
  "movieName": "Tên phim trích xuất được (nếu có, hãy chuẩn hóa)",
  "cinemaName": "Tên rạp trích xuất được (nếu có, hãy chuẩn hóa)",
  "date": "Ngày trích xuất được dưới dạng YYYY-MM-DD (nếu có, ví dụ: 'ngày mai' -> tính theo ngày hiện tại)"
}

Chỉ trả về JSON hợp lệ, tuyệt đối không thêm bất kỳ dòng text, markdown block hoặc giải thích nào khác ngoài JSON.
`;

    const entry = this.modelChain[0];
    try {
      this.logger.log(`[${rid}] 🧠 Gemini NLU: Classifying intent for: "${message}"`);
      const responseText = await this.tryGenerateWithRetry(entry.model, entry.name, prompt, rid);
      if (!responseText) return null;

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      this.logger.log(`[${rid}] 🎯 Gemini NLU Result: ${JSON.stringify(parsed)}`);
      return {
        intent: parsed.intent as ChatIntent,
        movieName: parsed.movieName || undefined,
        cinemaName: parsed.cinemaName || undefined,
        date: parsed.date || undefined,
      };
    } catch (err: any) {
      this.logger.error(`[${rid}] ❌ Gemini NLU Classify error: ${err.message}`);
      return null;
    }
  }

  /**
   * Gửi prompt tới Gemini API để lấy câu trả lời tự nhiên.
   * Sử dụng model chain: thử từng model theo thứ tự, chuyển model khi lỗi quota.
   */
  async generateReply(params: GenerateReplyParams): Promise<GeminiResult> {
    const { userMessage, intent, isAuthenticated, backendData, requestId } = params;
    const rid = requestId || 'no-rid';
    const startTime = Date.now();

    // Xây dựng prompt (đã optimize token)
    const prompt = this.buildPrompt(userMessage, intent, isAuthenticated, backendData);

    this.logger.log(`[${rid}] 🚀 Gemini request | intent=${intent} | msg="${this.truncate(userMessage, 80)}" | prompt=${prompt.length} chars`);

    // Thử từng model trong chain
    for (let i = 0; i < this.modelChain.length; i++) {
      const entry = this.modelChain[i];
      const isLast = i === this.modelChain.length - 1;

      this.logger.log(`[${rid}] 🔄 Trying model ${i + 1}/${this.modelChain.length}: ${entry.name}`);

      const result = await this.tryGenerateWithRetry(entry.model, entry.name, prompt, rid);

      if (result !== null) {
        const elapsed = Date.now() - startTime;
        this.logger.log(`[${rid}] ✅ Gemini response (${entry.name}) | ${elapsed}ms | ${result.length} chars`);
        return {
          text: result,
          source: 'gemini',
          model: entry.name,
        };
      }

      // Model này fail
      if (!isLast) {
        this.logger.warn(`[${rid}] ⚠️ Model ${entry.name} failed, trying next model...`);
      }
    }

    // Tất cả model fail
    const elapsed = Date.now() - startTime;
    this.logger.error(`[${rid}] ❌ All ${this.modelChain.length} Gemini models failed after ${elapsed}ms`);
    return {
      text: FALLBACK_QUOTA_EXCEEDED,
      source: 'fallback',
      errorCode: 'QUOTA_EXCEEDED',
    };
  }

  /**
   * Thử gọi Gemini API với retry logic (exponential backoff).
   * Chỉ retry cho lỗi tạm thời (500/503/network). Không retry cho quota_exceeded.
   * Trả về text nếu thành công, null nếu tất cả retry đều fail.
   */
  private async tryGenerateWithRetry(
    model: GenerativeModel,
    modelName: string,
    prompt: string,
    rid: string,
  ): Promise<string | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = GEMINI_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(`[${rid}] 🔄 Retry ${attempt}/${GEMINI_MAX_RETRIES} (${modelName}) after ${delay}ms`);
        await this.sleep(delay);
      }

      try {
        const text = await this.callGeminiWithTimeout(model, prompt, rid);
        if (text && text.trim().length > 0) {
          return text.trim();
        }
        // Response rỗng — không retry
        this.logger.warn(`[${rid}] ⚠️ Gemini returned empty response (${modelName})`);
        return FALLBACK_EMPTY_RESPONSE;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        const errorInfo = this.detectGeminiError(err);

        // Log chi tiết
        this.logger.error(
          `[${rid}] ❌ Gemini error | model=${modelName} | attempt=${attempt + 1}/${GEMINI_MAX_RETRIES + 1} | ` +
          `errorCode=${errorInfo.type} | httpStatus=${errorInfo.httpStatus || 'N/A'} | ` +
          `quotaMetric=${errorInfo.quotaMetric || 'N/A'} | retryDelay=${errorInfo.retryDelay || 'N/A'} | ` +
          `msg=${this.truncate(err.message, 200)}`,
        );

        // === QUOTA EXCEEDED: không retry, chuyển model khác ===
        if (errorInfo.type === 'QUOTA_EXCEEDED') {
          // Kiểm tra nếu có retryDelay hợp lệ và nhỏ → có thể retry 1 lần
          if (
            errorInfo.retryDelay &&
            errorInfo.retryDelay > 0 &&
            errorInfo.retryDelay < GEMINI_MAX_ACCEPTABLE_RETRY_DELAY_MS &&
            attempt === 0 // Chỉ retry 1 lần
          ) {
            this.logger.warn(
              `[${rid}] ⏳ RESOURCE_EXHAUSTED with retryDelay=${errorInfo.retryDelay}ms — retrying once`,
            );
            await this.sleep(errorInfo.retryDelay);
            continue; // Retry
          }

          this.logger.warn(`[${rid}] ⚠️ Quota exceeded (${modelName}), skipping to next model`);
          return null; // Chuyển sang model tiếp theo
        }

        // === NON-RETRYABLE ERRORS: trả fallback message ===
        if (!errorInfo.retryable) {
          this.logger.warn(`[${rid}] ⛔ Non-retryable error (${errorInfo.type}), returning fallback`);
          return errorInfo.fallbackMessage;
        }

        // === RETRYABLE ERRORS: tiếp tục retry loop ===
        // (500, 503, network, timeout, unknown)
      }
    }

    // Hết retry
    this.logger.error(`[${rid}] ❌ Max retries exhausted for ${modelName}: ${lastError?.message}`);
    return null; // Trả null để caller thử model khác
  }

  /**
   * Gọi Gemini API với timeout protection.
   */
  private async callGeminiWithTimeout(
    model: GenerativeModel,
    prompt: string,
    rid: string,
  ): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`TIMEOUT: Gemini API không phản hồi sau ${GEMINI_REQUEST_TIMEOUT_MS}ms`));
      }, GEMINI_REQUEST_TIMEOUT_MS);
    });

    const apiPromise = (async () => {
      const result = await model.generateContent(prompt);

      if (!result) {
        throw new Error('EMPTY_RESULT: Gemini trả về result null/undefined');
      }
      if (!result.response) {
        throw new Error('NO_RESPONSE: Gemini result không có response object');
      }

      let text: string;
      try {
        text = result.response.text();
      } catch (textError: unknown) {
        const textErr = textError instanceof Error ? textError : new Error(String(textError));
        throw new Error(`TEXT_EXTRACT_FAILED: Không thể lấy text từ response: ${textErr.message}`);
      }

      return text;
    })();

    return Promise.race([apiPromise, timeoutPromise]);
  }

  /**
   * Xây dựng prompt hoàn chỉnh gửi cho Gemini.
   * Tối ưu token: truncate message + backend data.
   */
  private buildPrompt(
    userMessage: string,
    intent: string,
    isAuthenticated: boolean,
    backendData: unknown,
  ): string {
    // Truncate user message
    const truncatedMessage =
      userMessage.length > MAX_MESSAGE_LENGTH
        ? userMessage.substring(0, MAX_MESSAGE_LENGTH) + '...'
        : userMessage;

    // Truncate backend data
    let dataString: string;
    if (backendData !== null && backendData !== undefined) {
      const raw = JSON.stringify(backendData, null, 2);
      dataString =
        raw.length > MAX_BACKEND_DATA_LENGTH
          ? raw.substring(0, MAX_BACKEND_DATA_LENGTH) + '\n... (dữ liệu đã được rút gọn)'
          : raw;
    } else {
      dataString = '';
    }

    return `${SYSTEM_PROMPT}

CONTEXT_FROM_DATABASE:
${dataString || 'Không có dữ liệu'}

---

User question:
${truncatedMessage}

Intent:
${intent}

Authenticated:
${isAuthenticated}

Instruction:
Dựa vào CONTEXT_FROM_DATABASE để trả lời người dùng. Không thêm dữ liệu không có trong CONTEXT_FROM_DATABASE.
Nếu CONTEXT_FROM_DATABASE là "Không có dữ liệu" hoặc rỗng, trả lời rằng hiện tại hệ thống chưa có thông tin phù hợp.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Tuyệt đối không tự bịa thông tin.`;
  }

  /**
   * Phân loại lỗi Gemini chi tiết — detectGeminiError
   * Parse error message và metadata để xác định loại lỗi, khả năng retry,
   * và thông tin bổ sung (quotaMetric, retryDelay, httpStatus).
   */
  private detectGeminiError(error: Error): GeminiErrorInfo {
    const msg = error.message?.toLowerCase() || '';
    const fullMsg = error.message || '';

    // Cố gắng parse thêm thông tin từ error
    let quotaMetric: string | undefined;
    let retryDelay: number | undefined;
    let httpStatus: number | undefined;

    // Extract HTTP status
    const statusMatch = fullMsg.match(/(\d{3})/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      if (code >= 400 && code <= 599) {
        httpStatus = code;
      }
    }

    // Extract quota metric name
    const metricMatch = fullMsg.match(/(generate_content\w+)/i);
    if (metricMatch) {
      quotaMetric = metricMatch[1];
    }

    // Extract retry delay
    const retryMatch = fullMsg.match(/retry(?:After|Delay)[:\s]*(\d+)/i);
    if (retryMatch) {
      retryDelay = parseInt(retryMatch[1], 10);
      // Nếu đơn vị là giây, convert sang ms
      if (retryDelay < 1000) retryDelay *= 1000;
    }

    // === 429 QUOTA_EXCEEDED / RESOURCE_EXHAUSTED ===
    if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate')) {
      return {
        type: 'QUOTA_EXCEEDED',
        retryable: false,
        fallbackMessage: FALLBACK_QUOTA_EXCEEDED,
        httpStatus: httpStatus || 429,
        quotaMetric,
        retryDelay,
      };
    }

    // === 401/403 — sai API key hoặc không có quyền ===
    if (msg.includes('api_key') || msg.includes('api key') || msg.includes('401') || msg.includes('403') || msg.includes('permission') || msg.includes('unauthorized')) {
      return {
        type: 'INVALID_API_KEY',
        retryable: false,
        fallbackMessage: FALLBACK_INVALID_API_KEY,
        httpStatus: httpStatus || 403,
      };
    }

    // === 400 — Bad request / prompt quá dài ===
    if (msg.includes('400') || msg.includes('bad request') || msg.includes('invalid') || msg.includes('too long') || msg.includes('token limit')) {
      return {
        type: 'BAD_REQUEST',
        retryable: false,
        fallbackMessage: FALLBACK_BAD_REQUEST,
        httpStatus: 400,
      };
    }

    // === 500/503 — Lỗi phía Gemini server → retryable ===
    if (msg.includes('500') || msg.includes('503') || msg.includes('unavailable') || msg.includes('internal')) {
      return {
        type: 'SERVER_ERROR',
        retryable: true,
        fallbackMessage: FALLBACK_GENERIC_ERROR,
        httpStatus: httpStatus || 500,
      };
    }

    // === Timeout → retryable ===
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
      return {
        type: 'TIMEOUT',
        retryable: true,
        fallbackMessage: FALLBACK_TIMEOUT,
      };
    }

    // === Network error → retryable ===
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('fetch failed')) {
      return {
        type: 'NETWORK_ERROR',
        retryable: true,
        fallbackMessage: FALLBACK_GENERIC_ERROR,
      };
    }

    // === Model không tồn tại (404) ===
    if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
      return {
        type: 'MODEL_NOT_FOUND',
        retryable: false,
        fallbackMessage: FALLBACK_GENERIC_ERROR,
        httpStatus: 404,
      };
    }

    // === Safety block / content filter ===
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('HARM') || msg.includes('text_extract_failed')) {
      return {
        type: 'CONTENT_BLOCKED',
        retryable: false,
        fallbackMessage: FALLBACK_EMPTY_RESPONSE,
      };
    }

    // === Unknown — retry vì có thể là lỗi tạm thời ===
    return {
      type: 'UNKNOWN',
      retryable: true,
      fallbackMessage: FALLBACK_GENERIC_ERROR,
    };
  }

  /** Truncate text cho log output */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /** Promise-based sleep */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
