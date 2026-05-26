export enum ChatIntent {
  CURRENT_MOVIES = 'CURRENT_MOVIES',
  NOW_SHOWING = 'NOW_SHOWING',
  TODAY_MOVIES = 'TODAY_MOVIES',
  UPCOMING_MOVIES = 'UPCOMING_MOVIES',
  MOVIE_DETAIL = 'MOVIE_DETAIL',
  MOVIE_BY_GENRE = 'MOVIE_BY_GENRE',
  SHOWTIMES = 'SHOWTIMES',
  SHOWTIMES_BY_MOVIE = 'SHOWTIMES_BY_MOVIE',
  SHOWTIMES_BY_CINEMA = 'SHOWTIMES_BY_CINEMA',
  SHOWTIMES_BY_DATE = 'SHOWTIMES_BY_DATE',
  TICKET_PRICE = 'TICKET_PRICE',
  SEAT_AVAILABILITY = 'SEAT_AVAILABILITY',
  FOOD_COMBO = 'FOOD_COMBO',
  COMBO = 'COMBO',
  BOOKING_STATUS = 'BOOKING_STATUS',
  BOOKING_GUIDE = 'BOOKING_GUIDE',
  GREETING = 'GREETING',
  OUT_OF_SCOPE = 'OUT_OF_SCOPE',
}

/** Nguồn trả lời */
export type ResponseSource = 'gemini' | 'fallback' | 'rule';

/** Response chuẩn hóa từ chatbot API */
export interface ChatbotResponse {
  success: boolean;
  reply: string;
  /** Nguồn xử lý: gemini (AI), rule (xử lý nội bộ), fallback (khi Gemini lỗi) */
  source: ResponseSource;
  /** Mã lỗi nếu có: QUOTA_EXCEEDED, RATE_LIMITED, INVALID_API_KEY, etc. */
  errorCode?: string;
  /** Model Gemini đã sử dụng (nếu source = gemini) */
  model?: string;
  data?: any;
}

/** Kết quả phân loại intent */
export interface IntentResult {
  intent: ChatIntent;
  /** Từ khóa trích xuất được (VD: tên phim, tên rạp) */
  extractedKeyword?: string;
  movieName?: string;
  cinemaName?: string;
  date?: string;
}

/** Kết quả từ GeminiService */
export interface GeminiResult {
  text: string;
  source: 'gemini' | 'fallback';
  model?: string;
  errorCode?: string;
}

