/**
 * Constants cho Gemini AI configuration
 * Model names được đọc từ .env — các giá trị ở đây chỉ là default fallback
 */

// ============ MODEL DEFAULTS (chỉ dùng khi .env không cấu hình) ============

/** Model mặc định nếu GEMINI_MODEL không có trong .env */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/** Danh sách model mặc định nếu GEMINI_MODELS không có trong .env */
export const DEFAULT_GEMINI_MODELS = 'gemini-2.5-flash,gemini-2.0-flash-lite';

// ============ TIMEOUT & RETRY ============

/** Timeout cho mỗi request tới Gemini API (ms) */
export const GEMINI_REQUEST_TIMEOUT_MS = 30_000;

/** Số lần retry tối đa khi gặp lỗi tạm thời (500/503/network) */
export const GEMINI_MAX_RETRIES = 2;

/** Thời gian chờ ban đầu giữa các lần retry (ms) — tăng theo exponential backoff */
export const GEMINI_RETRY_BASE_DELAY_MS = 1_000;

/** Retry delay tối đa chấp nhận từ API response (ms) — nếu server yêu cầu chờ lâu hơn → skip */
export const GEMINI_MAX_ACCEPTABLE_RETRY_DELAY_MS = 60_000;

// ============ TOKEN OPTIMIZATION ============

/** Số tin nhắn lịch sử tối đa gửi cho Gemini */
export const MAX_HISTORY_MESSAGES = 5;

/** Độ dài tối đa của 1 tin nhắn user (chars) */
export const MAX_MESSAGE_LENGTH = 500;

/** Độ dài tối đa của backend data JSON gửi cho Gemini (chars) */
export const MAX_BACKEND_DATA_LENGTH = 3_000;

// ============ RATE LIMITING ============

/** Guest: tối đa request/phút */
export const RATE_LIMIT_GUEST_MAX = 10;
export const RATE_LIMIT_GUEST_TTL_MS = 60_000;

/** User đã login: tối đa request/phút */
export const RATE_LIMIT_USER_MAX = 30;
export const RATE_LIMIT_USER_TTL_MS = 60_000;

// ============ FALLBACK RESPONSES ============

/** Response khi Gemini API bị quá tải (quota exceeded / rate limit) */
export const FALLBACK_QUOTA_EXCEEDED =
  'Chatbot hiện đang quá tải. Vui lòng thử lại sau vài giây. ⏳';

/** Response khi API key không hợp lệ hoặc bị vô hiệu hóa */
export const FALLBACK_INVALID_API_KEY =
  'Xin lỗi, chatbot hiện đang gặp sự cố cấu hình. Đội ngũ kỹ thuật đã được thông báo. 🔧';

/** Response khi request sai format hoặc prompt quá dài */
export const FALLBACK_BAD_REQUEST =
  'Xin lỗi, tin nhắn của bạn không thể xử lý được. Vui lòng thử lại với nội dung ngắn hơn. 📝';

/** Response khi Gemini trả về empty hoặc không parse được */
export const FALLBACK_EMPTY_RESPONSE =
  'Xin lỗi, tôi không thể xử lý câu hỏi này lúc này. Vui lòng thử lại hoặc đặt câu hỏi khác. 🤔';

/** Response khi timeout */
export const FALLBACK_TIMEOUT =
  'Xin lỗi, hệ thống phản hồi chậm hơn bình thường. Vui lòng thử lại sau ít giây. ⏱️';

/** Response khi lỗi network hoặc lỗi không xác định */
export const FALLBACK_GENERIC_ERROR =
  'Xin lỗi, hiện tại chatbot đang gặp sự cố. Vui lòng thử lại sau. 🙏';

/** Response khi vượt rate limit */
export const FALLBACK_RATE_LIMITED =
  'Bạn đang gửi quá nhiều tin nhắn, vui lòng thử lại sau. ⏳';
