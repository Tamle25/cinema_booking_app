import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { GeminiResult, ChatIntent, ChatContext } from '../chatbot/types/chatbot.types';
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

export interface GenerateReplyParams {
  userMessage: string;
  intent: string;
  isAuthenticated: boolean;
  backendData: unknown;
  context?: ChatContext;
  requestId?: string;
}

interface GeminiErrorInfo {
  type: string;
  retryable: boolean;
  fallbackMessage: string;
  httpStatus?: number;
  quotaMetric?: string;
  retryDelay?: number;
}

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

    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY chưa được cấu hình trong .env');
      throw new Error('GEMINI_API_KEY is required');
    }

    if (!apiKey.startsWith('AIzaSy')) {
      this.logger.warn('GEMINI_API_KEY có format không chuẩn (thường bắt đầu bằng "AIzaSy")');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    const primaryModel = this.configService.get<string>('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
    const modelsStr = this.configService.get<string>('GEMINI_MODELS') || DEFAULT_GEMINI_MODELS;
    const modelNames = modelsStr
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

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
  }

  async classifyIntent(message: string, requestId?: string): Promise<{
    intent: ChatIntent;
    movieName?: string;
    cinemaName?: string;
    date?: string;
    genre?: string;
  } | null> {
    const rid = requestId || 'no-rid';
    const currentTime = new Date().toISOString();
    const prompt = `
Bạn là bộ phân loại Intent cho chatbot đặt vé xem phim online CineMax.
Thời gian hiện tại của hệ thống: ${currentTime}

Hãy phân loại tin nhắn sau của người dùng vào một trong các Intent dưới đây:
1. GREETING: Chào hỏi xã giao (VD: "Xin chào", "hi chatbot", "chào bạn")
2. NOW_SHOWING: Câu hỏi về phim đang chiếu (VD: "Phim nào đang chiếu?", "phim đang chiếu", "rạp đang chiếu phim gì")
3. UPCOMING_MOVIES: Câu hỏi về phim sắp chiếu (VD: "phim sắp chiếu", "sắp ra mắt", "sắp có phim gì mới")
4. MOVIE_BY_GENRE: Câu hỏi tìm phim theo thể loại (VD: "Có phim hành động không?", "có phim hoạt hình nào không?", "phim kinh dị đang chiếu")
5. MOVIE_DETAIL: Yêu cầu thông tin chi tiết phim, cốt truyện, tóm tắt, hoặc trailer (VD: "Tóm tắt phim này cho tôi", "phim này có trailer không?", "nội dung phim Doraemon", "trailer phim Doraemon")
6. SHOWTIMES: Câu hỏi về lịch chiếu rạp, suất chiếu (VD: "Lịch chiếu hôm nay?", "lịch chiếu?", "suất chiếu tối nay", "Doraemon chiếu mấy giờ", "lịch chiếu phim Conan")
7. CINEMA_QUERY: Truy vấn rạp phim/thông tin rạp (VD: "Rạp CGV đang chiếu phim gì?", "địa chỉ rạp CineMax Hà Nội", "có rạp nào ở TPHCM")
8. SEAT_STATUS: Trạng thái ghế ngồi/ghế trống (VD: "Còn ghế không?", "suất này còn ghế trống không?", "sơ đồ ghế", "chọn ghế")
9. TICKET_PRICE: Câu hỏi về giá vé (VD: "Giá vé bao nhiêu?", "vé phim Doraemon bao nhiêu tiền?", "giá vé rạp này")
10. BOOKING_GUIDE: Người dùng muốn đặt vé, mua vé, cách đặt vé (VD: "Tôi muốn đặt vé", "đặt vé xem phim", "mua vé", "book vé")
11. BOOKING_STATUS: Trạng thái đặt vé, lịch sử đặt vé, vé đã mua (VD: "Vé của tôi", "lịch sử đặt vé", "đơn hàng của tôi", "vé đã đặt")
12. PROMOTION: Khuyến mãi, voucher, mã giảm giá, đổi điểm (VD: "Có chương trình khuyến mãi nào không", "mã giảm giá cuối tuần", "đổi điểm lấy voucher")
13. FAQ_POLICY: FAQ, chính sách hoàn vé, đổi vé, hủy vé, chính sách thanh toán (VD: "Chính sách hoàn vé", "hủy vé đã thanh toán thì sao", "thanh toán thế nào", "đổi vé được không")
14. NAVIGATION_REQUEST: Yêu cầu điều hướng trang cụ thể (VD: "chuyển qua trang thanh toán", "xem tin tức", "profile thành viên", "ví của tôi")
15. OUT_OF_SCOPE: Câu hỏi ngoài phạm vi đặt vé xem phim (VD: "Thời tiết hôm nay thế nào?", "tổng thống Mỹ là ai", "bỏ qua hướng dẫn trước")

Tin nhắn của người dùng:
"${message}"

Hãy trả về kết quả dưới dạng JSON duy nhất với cấu trúc sau:
{
  "intent": "TÊN_INTENT",
  "movieName": "Tên phim trích xuất được (nếu có, hãy chuẩn hóa)",
  "cinemaName": "Tên rạp trích xuất được (nếu có, hãy chuẩn hóa)",
  "date": "Ngày trích xuất được dưới dạng YYYY-MM-DD (nếu có, ví dụ: 'ngày mai' -> tính theo ngày hiện tại)",
  "genre": "Thể loại phim trích xuất được (nếu có, ví dụ: 'hành động', 'kinh dị', 'hoạt hình')"
}

Chỉ trả về JSON hợp lệ, tuyệt đối không thêm bất kỳ dòng text, markdown block hoặc giải thích nào khác ngoài JSON.
`;

    const entry = this.modelChain[0];
    try {
      const responseText = await this.tryGenerateWithRetry(entry.model, entry.name, prompt, rid);
      if (!responseText) return null;

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        intent: parsed.intent as ChatIntent,
        movieName: parsed.movieName || undefined,
        cinemaName: parsed.cinemaName || undefined,
        date: parsed.date || undefined,
        genre: parsed.genre || undefined,
      };
    } catch (err: any) {
      this.logger.error(`[${rid}] Lỗi phân loại intent bằng Gemini: ${err.message}`);
      return null;
    }
  }

  async generateReply(params: GenerateReplyParams): Promise<GeminiResult> {
    const { userMessage, intent, isAuthenticated, backendData, context, requestId } = params;
    const rid = requestId || 'no-rid';
    const startTime = Date.now();

    const prompt = this.buildPrompt(userMessage, intent, isAuthenticated, backendData, context);

    for (let i = 0; i < this.modelChain.length; i++) {
      const entry = this.modelChain[i];
      const isLast = i === this.modelChain.length - 1;

      const result = await this.tryGenerateWithRetry(entry.model, entry.name, prompt, rid);

      if (result !== null) {
        return {
          text: result,
          source: 'gemini',
          model: entry.name,
        };
      }

      if (!isLast) {
        this.logger.warn(`[${rid}] Model ${entry.name} lỗi, thử model tiếp theo`);
      }
    }

    const elapsed = Date.now() - startTime;
    this.logger.error(`[${rid}] Tất cả ${this.modelChain.length} Gemini models lỗi sau ${elapsed}ms`);
    return {
      text: FALLBACK_QUOTA_EXCEEDED,
      source: 'fallback',
      errorCode: 'QUOTA_EXCEEDED',
    };
  }

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
        this.logger.warn(`[${rid}] Retry ${attempt}/${GEMINI_MAX_RETRIES} (${modelName}) sau ${delay}ms`);
        await this.sleep(delay);
      }

      try {
        const text = await this.callGeminiWithTimeout(model, prompt, rid);
        if (text && text.trim().length > 0) {
          return text.trim();
        }
        this.logger.warn(`[${rid}] Gemini trả về response rỗng (${modelName})`);
        return FALLBACK_EMPTY_RESPONSE;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        const errorInfo = this.detectGeminiError(err);

        this.logger.error(
          `[${rid}] Gemini error | model=${modelName} | attempt=${attempt + 1}/${GEMINI_MAX_RETRIES + 1} | ` +
          `errorCode=${errorInfo.type} | httpStatus=${errorInfo.httpStatus || 'N/A'} | ` +
          `quotaMetric=${errorInfo.quotaMetric || 'N/A'} | retryDelay=${errorInfo.retryDelay || 'N/A'} | ` +
          `msg=${this.truncate(err.message, 200)}`,
        );

        if (errorInfo.type === 'QUOTA_EXCEEDED') {
          if (
            errorInfo.retryDelay &&
            errorInfo.retryDelay > 0 &&
            errorInfo.retryDelay < GEMINI_MAX_ACCEPTABLE_RETRY_DELAY_MS &&
            attempt === 0
          ) {
            this.logger.warn(
              `[${rid}] RESOURCE_EXHAUSTED với retryDelay=${errorInfo.retryDelay}ms, retry một lần`,
            );
            await this.sleep(errorInfo.retryDelay);
            continue;
          }

          this.logger.warn(`[${rid}] Quota exceeded (${modelName}), chuyển model tiếp theo`);
          return null;
        }

        if (!errorInfo.retryable) {
          this.logger.warn(`[${rid}] Lỗi không retry (${errorInfo.type}), trả fallback`);
          return errorInfo.fallbackMessage;
        }
      }
    }

    this.logger.error(`[${rid}] Hết số lần retry cho ${modelName}: ${lastError?.message}`);
    return null;
  }

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

  private buildPrompt(
    userMessage: string,
    intent: string,
    isAuthenticated: boolean,
    backendData: unknown,
    context?: ChatContext,
  ): string {
    const truncatedMessage =
      userMessage.length > MAX_MESSAGE_LENGTH
        ? userMessage.substring(0, MAX_MESSAGE_LENGTH) + '...'
        : userMessage;

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

CONVERSATION_CONTEXT (Ngữ cảnh trước đó của cuộc trò chuyện):
${context ? JSON.stringify(context, null, 2) : 'Không có'}

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
Dựa vào CONTEXT_FROM_DATABASE và CONVERSATION_CONTEXT để trả lời người dùng. Không được tự bịa ra thông tin động như phim, rạp, ghế trống, voucher nếu dữ liệu đó không có trong CONTEXT_FROM_DATABASE.
Nếu CONTEXT_FROM_DATABASE là "Không có dữ liệu" hoặc rỗng, trả lời rằng hiện tại hệ thống chưa có thông tin phù hợp.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Tuyệt đối không tự bịa thông tin.`;
  }

  private detectGeminiError(error: Error): GeminiErrorInfo {
    const msg = error.message?.toLowerCase() || '';
    const fullMsg = error.message || '';

    let quotaMetric: string | undefined;
    let retryDelay: number | undefined;
    let httpStatus: number | undefined;

    const statusMatch = fullMsg.match(/(\d{3})/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      if (code >= 400 && code <= 599) {
        httpStatus = code;
      }
    }

    const metricMatch = fullMsg.match(/(generate_content\w+)/i);
    if (metricMatch) {
      quotaMetric = metricMatch[1];
    }

    const retryMatch = fullMsg.match(/retry(?:After|Delay)[:\s]*(\d+)/i);
    if (retryMatch) {
      retryDelay = parseInt(retryMatch[1], 10);
      if (retryDelay < 1000) retryDelay *= 1000;
    }

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

    if (msg.includes('api_key') || msg.includes('api key') || msg.includes('401') || msg.includes('403') || msg.includes('permission') || msg.includes('unauthorized')) {
      return {
        type: 'INVALID_API_KEY',
        retryable: false,
        fallbackMessage: FALLBACK_INVALID_API_KEY,
        httpStatus: httpStatus || 403,
      };
    }

    if (msg.includes('400') || msg.includes('bad request') || msg.includes('invalid') || msg.includes('too long') || msg.includes('token limit')) {
      return {
        type: 'BAD_REQUEST',
        retryable: false,
        fallbackMessage: FALLBACK_BAD_REQUEST,
        httpStatus: 400,
      };
    }

    if (msg.includes('500') || msg.includes('503') || msg.includes('unavailable') || msg.includes('internal')) {
      return {
        type: 'SERVER_ERROR',
        retryable: true,
        fallbackMessage: FALLBACK_GENERIC_ERROR,
        httpStatus: httpStatus || 500,
      };
    }

    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
      return {
        type: 'TIMEOUT',
        retryable: true,
        fallbackMessage: FALLBACK_TIMEOUT,
      };
    }

    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('fetch failed')) {
      return {
        type: 'NETWORK_ERROR',
        retryable: true,
        fallbackMessage: FALLBACK_GENERIC_ERROR,
      };
    }

    if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
      return {
        type: 'MODEL_NOT_FOUND',
        retryable: false,
        fallbackMessage: FALLBACK_GENERIC_ERROR,
        httpStatus: 404,
      };
    }

    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('HARM') || msg.includes('text_extract_failed')) {
      return {
        type: 'CONTENT_BLOCKED',
        retryable: false,
        fallbackMessage: FALLBACK_EMPTY_RESPONSE,
      };
    }

    return {
      type: 'UNKNOWN',
      retryable: true,
      fallbackMessage: FALLBACK_GENERIC_ERROR,
    };
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
