// ============================================================
// Gemini Model Defaults
// ============================================================

/** Model nhanh/nhẹ: phân loại intent, trích xuất entity, câu hỏi đơn giản */
export const DEFAULT_FAST_MODEL = 'gemini-3.1-flash-lite';

/** Model thông minh: viết câu trả lời tự nhiên, hội thoại nhiều lượt */
export const DEFAULT_SMART_MODEL = 'gemini-3.5-flash';

// ============================================================
// Timeouts & Retries
// ============================================================

export const GEMINI_REQUEST_TIMEOUT_MS = 30_000;

export const GEMINI_MAX_RETRIES = 2;

export const GEMINI_RETRY_BASE_DELAY_MS = 1_000;

export const GEMINI_MAX_ACCEPTABLE_RETRY_DELAY_MS = 60_000;

// ============================================================
// Message Limits
// ============================================================

/** Số lượng tin nhắn conversation history tối đa gửi cho Gemini */
export const MAX_HISTORY_MESSAGES = 12;

export const MAX_MESSAGE_LENGTH = 500;

export const MAX_BACKEND_DATA_LENGTH = 3_000;

// ============================================================
// Rate Limiting
// ============================================================

export const RATE_LIMIT_GUEST_MAX = 10;
export const RATE_LIMIT_GUEST_TTL_MS = 60_000;

export const RATE_LIMIT_USER_MAX = 30;
export const RATE_LIMIT_USER_TTL_MS = 60_000;

// ============================================================
// Fallback Messages
// ============================================================

export const FALLBACK_QUOTA_EXCEEDED =
  'Chatbot hiện đang quá tải. Vui lòng thử lại sau vài giây.';

export const FALLBACK_INVALID_API_KEY =
  'Xin lỗi, chatbot hiện đang gặp sự cố cấu hình. Đội ngũ kỹ thuật đã được thông báo.';

export const FALLBACK_BAD_REQUEST =
  'Xin lỗi, tin nhắn của bạn không thể xử lý được. Vui lòng thử lại với nội dung ngắn hơn.';

export const FALLBACK_EMPTY_RESPONSE =
  'Xin lỗi, mình không thể xử lý câu hỏi này lúc này. Vui lòng thử lại hoặc đặt câu hỏi khác.';

export const FALLBACK_TIMEOUT =
  'Xin lỗi, hệ thống phản hồi chậm hơn bình thường. Vui lòng thử lại sau ít giây.';

export const FALLBACK_GENERIC_ERROR =
  'Xin lỗi, hiện tại chatbot đang gặp sự cố. Vui lòng thử lại sau.';

export const FALLBACK_RATE_LIMITED =
  'Bạn đang gửi quá nhiều tin nhắn, vui lòng thử lại sau.';
