export enum ChatIntent {
  GREETING = 'GREETING',
  NOW_SHOWING = 'NOW_SHOWING',
  UPCOMING_MOVIES = 'UPCOMING_MOVIES',
  MOVIE_BY_GENRE = 'MOVIE_BY_GENRE',
  MOVIE_DETAIL = 'MOVIE_DETAIL',
  SHOWTIMES = 'SHOWTIMES',
  CINEMA_QUERY = 'CINEMA_QUERY',
  SEAT_STATUS = 'SEAT_STATUS',
  TICKET_PRICE = 'TICKET_PRICE',
  BOOKING_GUIDE = 'BOOKING_GUIDE',
  BOOKING_STATUS = 'BOOKING_STATUS',
  PROMOTION = 'PROMOTION',
  FAQ_POLICY = 'FAQ_POLICY',
  NAVIGATION_REQUEST = 'NAVIGATION_REQUEST',
  OUT_OF_SCOPE = 'OUT_OF_SCOPE',
}

export type ResponseSource = 'gemini' | 'fallback' | 'rule';

export interface NavigationAction {
  type: 'NAVIGATE';
  label: string;
  url: string;
}

export interface ChatbotResponse {
  success: boolean;
  reply: string;
  conversationId: string;
  intent: string;
  suggestions: string[];
  actions: NavigationAction[];
  source: ResponseSource;
  errorCode?: string;
  model?: string;
}

export interface ChatContext {
  lastIntent?: string;

  lastMovieId?: string;
  lastMovieName?: string;
  lastMovieSlug?: string;
  lastMovieUrl?: string;

  lastGenre?: string;

  lastCinemaId?: string;
  lastCinemaName?: string;

  lastDate?: string;

  lastShowtimeId?: string;
  lastShowtimeUrl?: string;

  lastBookingStep?: string;
  lastBookingUrl?: string;

  lastNavigationAction?: string;

  lastResults?: any[];
}

export interface IntentResult {
  intent: ChatIntent;
  extractedKeyword?: string;
  movieName?: string;
  cinemaName?: string;
  date?: string;
  genre?: string;
}

export interface GeminiResult {
  text: string;
  source: 'gemini' | 'fallback';
  model?: string;
  errorCode?: string;
}

