import { Injectable, Logger } from '@nestjs/common';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';
import { ChatbotResponse, ChatIntent, GeminiResult, IntentResult } from './types/chatbot.types';
import { IntentService } from '../intent/intent.service';
import { BackendApiService } from '../backend-api/backend-api.service';
import { GeminiService } from '../gemini/gemini.service';
import { MAX_MESSAGE_LENGTH } from '../gemini/gemini.constants';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  /** Counter đơn giản cho request ID — reset khi restart service */
  private requestCounter = 0;

  constructor(
    private intentService: IntentService,
    private backendApiService: BackendApiService,
    private geminiService: GeminiService,
  ) {}

  async processMessage(
    dto: ChatbotMessageDto,
    authHeader?: string,
  ): Promise<ChatbotResponse> {
    const { message, isAuthenticated } = dto;
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Truncate message dài
    const truncatedMessage =
      message.length > MAX_MESSAGE_LENGTH
        ? message.substring(0, MAX_MESSAGE_LENGTH)
        : message;

    this.logger.log(
      `[${requestId}] 📩 Incoming message: "${this.truncate(truncatedMessage, 100)}" | auth=${!!isAuthenticated}`,
    );

    try {
      // 1. Chạy phân loại bằng rule-based trước để tiết kiệm API requests
      const ruleResult = this.intentService.classify(truncatedMessage);
      let intentResult: IntentResult = {
        intent: ruleResult.intent,
        movieName: ruleResult.movieName,
        cinemaName: ruleResult.cinemaName,
        date: ruleResult.date,
        extractedKeyword: ruleResult.extractedKeyword,
      };
      let classificationSource = 'rule-based';

      // 2. Nếu rule-based phân loại là OUT_OF_SCOPE, gọi Gemini NLU để phân loại lại thông minh hơn
      if (ruleResult.intent === ChatIntent.OUT_OF_SCOPE) {
        const nluResult = await this.geminiService.classifyIntent(truncatedMessage, requestId);
        if (nluResult && nluResult.intent) {
          intentResult = nluResult;
          classificationSource = 'gemini-nlu';
        }
      }

      this.logger.log(
        `[${requestId}] 🎯 Intent classified via ${classificationSource}: ${intentResult.intent}` +
        `${intentResult.movieName ? ` | movieName="${intentResult.movieName}"` : ''}` +
        `${intentResult.cinemaName ? ` | cinemaName="${intentResult.cinemaName}"` : ''}` +
        `${intentResult.date ? ` | date="${intentResult.date}"` : ''}`
      );

      // 3. Kiểm tra auth cho các intent cần đăng nhập
      if (intentResult.intent === ChatIntent.BOOKING_STATUS && !isAuthenticated) {
        const elapsed = Date.now() - startTime;
        this.logger.log(`[${requestId}] 🔐 Auth required but not authenticated | ${elapsed}ms`);
        return {
          success: true,
          reply: 'Bạn cần đăng nhập để xem thông tin vé đã đặt hoặc lịch sử đặt vé. Vui lòng đăng nhập và thử lại nhé! 🔐',
          source: 'rule',
        };
      }

      // 4. Xử lý OUT_OF_SCOPE trực tiếp (không gọi backend + không gọi Gemini NLG)
      if (intentResult.intent === ChatIntent.OUT_OF_SCOPE) {
        const elapsed = Date.now() - startTime;
        this.logger.log(`[${requestId}] 🚫 Out of scope request | source=rule | ${elapsed}ms`);
        return {
          success: true,
          reply: 'Mình chỉ hỗ trợ về phim, lịch chiếu, giá vé, ghế trống và combo bắp nước. Bạn cần hỗ trợ gì về đặt vé xem phim? 🎬',
          source: 'rule',
        };
      }

      // 4b. Xử lý BOOKING_GUIDE — hướng dẫn đặt vé theo flow
      if (intentResult.intent === ChatIntent.BOOKING_GUIDE && !intentResult.movieName) {
        const elapsed = Date.now() - startTime;
        this.logger.log(`[${requestId}] 🎟️ Booking guide (no movie specified) | source=rule | ${elapsed}ms`);
        // Lấy danh sách phim đang chiếu để gợi ý
        const movies = await this.backendApiService.getNowShowingMovies();
        if (movies && Array.isArray(movies) && movies.length > 0) {
          const list = movies.slice(0, 5).map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
          return {
            success: true,
            reply: `Để đặt vé, bạn chọn phim trước nhé:\n${list}\n\nBạn muốn xem phim nào?`,
            source: 'rule',
          };
        }
        return {
          success: true,
          reply: 'Bạn muốn đặt vé phim nào? Hãy cho mình biết tên phim nhé.',
          source: 'rule',
        };
      }

      // 5. Lấy dữ liệu từ backend API
      this.logger.log(`[${requestId}] 📡 Fetching backend data for intent: ${intentResult.intent}`);
      const rawBackendData = await this.fetchBackendData(
        intentResult,
        authHeader,
        requestId,
      );
      const backendData = this.sanitizeData(rawBackendData);

      const dataSnippet = backendData ? JSON.stringify(backendData).substring(0, 300) : 'null';
      this.logger.log(`[${requestId}] 🗄️ Backend data: ${dataSnippet}${backendData && JSON.stringify(backendData).length > 300 ? '...' : ''}`);

      if (!backendData || (Array.isArray(backendData) && backendData.length === 0)) {
        this.logger.warn(`[${requestId}] ⚠️ Backend returned empty or error data`);
      }

      // 6. Gọi Gemini NLG cho câu trả lời tự nhiên
      this.logger.log(`[${requestId}] 🤖 Sending to Gemini NLG...`);
      let geminiResult: GeminiResult;

      try {
        geminiResult = await this.geminiService.generateReply({
          userMessage: truncatedMessage,
          intent: intentResult.intent,
          isAuthenticated: isAuthenticated || false,
          backendData: backendData,
          requestId: requestId,
        });
      } catch (geminiError: unknown) {
        const err = geminiError instanceof Error ? geminiError : new Error(String(geminiError));
        this.logger.error(`[${requestId}] ❌ Gemini NLG exception: ${err.message}`);

        // Fallback sang rule-based response
        const ruleReply = this.formatRuleBasedResponse(intentResult.intent, backendData);
        if (ruleReply) {
          this.logger.log(`[${requestId}] 📋 Falling back to rule-based response after Gemini error`);
          return {
            success: true,
            reply: ruleReply,
            source: 'fallback',
            errorCode: 'GEMINI_EXCEPTION',
          };
        }

        return {
          success: true,
          reply: 'Xin lỗi, hiện tại chatbot đang gặp sự cố kết nối AI. Vui lòng thử lại sau. 🙏',
          source: 'fallback',
          errorCode: 'GEMINI_EXCEPTION',
        };
      }

      // 7. Thêm Guard Validation chống dữ liệu giả
      // Chỉ validate khi response từ Gemini AI thực sự, không validate fallback constants
      let isResponseValid = true;
      if (geminiResult.source === 'gemini') {
        isResponseValid = await this.validateResponseContent(
          geminiResult.text,
          backendData,
          intentResult.intent,
          requestId,
        );
      }

      if (!isResponseValid) {
        this.logger.warn(`[${requestId}] 🚨 Guard Validation FAILED! Hallucinated or malicious data detected in Gemini response.`);
        const ruleReply = this.formatRuleBasedResponse(intentResult.intent, backendData);
        const safeReply = ruleReply || 'Hiện tại hệ thống chưa tìm thấy thông tin phù hợp với yêu cầu của bạn. Bạn vui lòng thử lại với tên phim/rạp/ngày cụ thể hơn. 🎬';
        this.logger.log(`[${requestId}] 🛡️ Guard replaced response with safe fallback.`);
        return {
          success: true,
          reply: safeReply,
          source: 'fallback',
          errorCode: 'HALLUCINATION_DETECTED',
        };
      }

      const elapsed = Date.now() - startTime;

      // Nếu Gemini NLG trả về fallback (lỗi/quá tải), cố gắng dùng rule-based response chứa dữ liệu thật
      if (geminiResult.source === 'fallback') {
        const ruleReply = this.formatRuleBasedResponse(intentResult.intent, backendData);
        if (ruleReply) {
          this.logger.log(`[${requestId}] 📋 Gemini failed (source=fallback), fell back to rule-based response with real data.`);
          return {
            success: true,
            reply: ruleReply,
            source: 'fallback',
            errorCode: geminiResult.errorCode || 'GEMINI_FALLBACK',
          };
        }
      }

      this.logger.log(
        `[${requestId}] ✅ Final Response ready | source=${geminiResult.source} | model=${geminiResult.model} | ${elapsed}ms`,
      );

      return {
        success: true,
        reply: geminiResult.text,
        source: geminiResult.source as any,
        model: geminiResult.model,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      const elapsed = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] ❌ Error processing message after ${elapsed}ms: ${err.message}`,
        err.stack,
      );
      return {
        success: false,
        reply: 'Xin lỗi, hiện tại chatbot đang gặp sự cố. Vui lòng thử lại sau. 🙏',
        source: 'fallback',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Format dữ liệu backend thành text thân thiện cho rule-based response.
   * Hoạt động khi Gemini lỗi hoặc bị guard validation chặn.
   */
  private formatRuleBasedResponse(intent: ChatIntent, data: unknown): string | null {
    try {
      switch (intent) {
        case ChatIntent.CURRENT_MOVIES:
        case ChatIntent.NOW_SHOWING:
          return this.formatMovieList(data, 'đang chiếu');

        case ChatIntent.UPCOMING_MOVIES:
          return this.formatMovieList(data, 'sắp chiếu');

        case ChatIntent.BOOKING_GUIDE:
          return this.formatBookingGuide(data);

        case ChatIntent.TODAY_MOVIES:
          return this.formatMovieList(data, 'chiếu hôm nay');

        case ChatIntent.SHOWTIMES_BY_MOVIE:
        case ChatIntent.SHOWTIMES_BY_CINEMA:
        case ChatIntent.SHOWTIMES_BY_DATE:
        case ChatIntent.SHOWTIMES:
          return this.formatShowtimes(data);

        case ChatIntent.FOOD_COMBO:
        case ChatIntent.COMBO:
          return this.formatCombos(data);

        case ChatIntent.BOOKING_STATUS:
          return this.formatBookingStatus(data);

        case ChatIntent.TICKET_PRICE:
          return this.formatTicketPrice(data);

        case ChatIntent.SEAT_AVAILABILITY:
          return this.formatSeatAvailability(data);

        case ChatIntent.MOVIE_DETAIL:
          return this.formatMovieDetail(data);

        case ChatIntent.MOVIE_BY_GENRE:
          return this.formatMovieList(data, 'theo thể loại');

        case ChatIntent.GREETING:
          return 'Xin chào! Mình là chatbot hỗ trợ đặt vé xem phim CineMax. Bạn cần hỗ trợ gì về phim, lịch chiếu, giá vé hay bắp nước không? 🎬';

        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /** Format thông tin chi tiết phim cho rule-based fallback */
  private formatMovieDetail(data: any): string {
    if (!data) return 'Hiện chưa có thông tin chi tiết cho bộ phim này.';
    const movie = Array.isArray(data) ? data[0] : data;
    if (!movie || !movie.title) return 'Hiện chưa có thông tin chi tiết cho bộ phim này.';

    let reply = `Thông tin phim **${movie.title}**:\n`;
    if (movie.genre) reply += `* Thể loại: ${movie.genre}\n`;
    if (movie.duration) reply += `* Thời lượng: ${movie.duration} phút\n`;
    if (movie.language) reply += `* Ngôn ngữ: ${movie.language}\n`;
    if (movie.description) reply += `* Nội dung: ${movie.description.substring(0, 120)}...\n`;
    if (movie.trailer_url) reply += `* Trailer xem tại: ${movie.trailer_url}\n`;
    return reply.trim();
  }

  /** Format danh sách phim */
  private formatMovieList(data: unknown, type: string): string | null {
    if (!Array.isArray(data) || data.length === 0) {
      return `Hiện chưa có phim ${type} nào.`;
    }

    const movies = data.slice(0, 5);
    let reply = `Phim ${type}:\n`;
    movies.forEach((movie: any, i: number) => {
      reply += `${i + 1}. ${movie.title || 'Chưa có tên'}`;
      if (movie.genre) reply += ` — ${movie.genre}`;
      if (movie.duration) reply += ` — ${movie.duration} phút`;
      reply += '\n';
    });

    if (data.length > 5) {
      reply += `\n...và ${data.length - 5} phim khác. Bạn muốn xem thêm không?`;
    }

    reply += `\nBạn muốn xem lịch chiếu phim nào?`;
    return reply;
  }

  /** Format lịch chiếu */
  private formatShowtimes(data: unknown): string | null {
    const showtimes = Array.isArray(data) ? data : null;
    if (!showtimes || showtimes.length === 0) {
      return 'Hiện chưa có lịch chiếu phù hợp. Bạn thử chọn phim hoặc ngày cụ thể hơn nhé.';
    }

    let reply = 'Lịch chiếu:\n';
    const shown = showtimes.slice(0, 5);
    shown.forEach((st: any) => {
      const movieName = st.movie?.title || st.movie_id?.title || 'Phim';
      const cinemaName = st.cinema?.name || st.cinema_id?.name || '';
      const time = st.start_time
        ? new Date(st.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '';
      reply += `- ${movieName}`;
      if (cinemaName) reply += ` | ${cinemaName}`;
      if (time) reply += ` | ${time}`;
      reply += '\n';
    });

    if (showtimes.length > 5) {
      reply += `\n...và ${showtimes.length - 5} suất khác. Bạn muốn xem thêm không?`;
    }
    reply += '\nBạn muốn đặt vé suất nào?';
    return reply;
  }

  /** Format combo bắp nước */
  private formatCombos(data: unknown): string | null {
    if (!Array.isArray(data) || data.length === 0) {
      return 'Hiện chưa có thông tin combo bắp nước.';
    }

    const combos = data.slice(0, 5);
    let reply = 'Combo bắp nước:\n';
    combos.forEach((combo: any, i: number) => {
      reply += `${i + 1}. ${combo.name || 'Combo'}`;
      if (combo.price) {
        reply += ` — ${Number(combo.price).toLocaleString('vi-VN')}đ`;
      }
      reply += '\n';
    });

    if (data.length > 5) {
      reply += `\n...và ${data.length - 5} combo khác. Bạn muốn xem thêm không?`;
    }
    return reply;
  }

  /** Format trạng thái đặt vé */
  private formatBookingStatus(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) {
      return 'Bạn chưa có đơn đặt vé nào.';
    }

    const bookings = data.slice(0, 5);
    let reply = 'Vé đã đặt:\n';
    bookings.forEach((booking: any, i: number) => {
      const movieTitle = booking.showtime?.movie?.title || 'Phim';
      const cinemaName = booking.showtime?.cinema?.name || 'Rạp';
      const time = booking.showtime?.start_time
        ? new Date(booking.showtime.start_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
        : '';
      const seats = Array.isArray(booking.seats) ? booking.seats.join(', ') : '';
      const status = booking.status === 'PAID' ? 'Đã thanh toán' : booking.status === 'PENDING' ? 'Chờ thanh toán' : 'Đã hủy';

      reply += `${i + 1}. ${movieTitle} | ${cinemaName} | Ghế: ${seats}\n`;
      reply += `   Suất: ${time} | ${status}\n`;
    });

    if (data.length > 5) {
      reply += `\n...và ${data.length - 5} vé khác. Bạn muốn xem thêm không?`;
    }

    return reply.trim();
  }

  /** Format giá vé */
  private formatTicketPrice(data: unknown): string {
    const showtimes = Array.isArray(data) ? data : [];
    if (showtimes.length === 0) {
      return 'Hiện chưa có thông tin giá vé cụ thể. Bạn thử chọn phim cụ thể hơn nhé.';
    }

    const first = showtimes[0];
    const movieTitle = first.movie?.title || '';
    let reply = movieTitle ? `Giá vé phim ${movieTitle}:\n` : 'Giá vé:\n';
    
    const prices = [...new Set(showtimes.map((st: any) => st.price))].filter(Boolean);
    if (prices.length > 0) {
      prices.forEach((price: any) => {
        reply += `- ${Number(price).toLocaleString('vi-VN')}đ\n`;
      });
    } else {
      reply += 'Chưa có thông tin giá cụ thể.';
    }

    return reply;
  }

  /** Format trạng thái ghế trống */
  private formatSeatAvailability(data: unknown): string {
    const showtimes = Array.isArray(data) ? data : [];
    if (showtimes.length === 0) {
      return 'Không tìm thấy suất chiếu phù hợp. Bạn chọn phim và rạp cụ thể hơn nhé.';
    }

    let reply = 'Ghế trống:\n';
    const limit = showtimes.slice(0, 5);
    limit.forEach((st: any) => {
      const movieTitle = st.movie?.title || 'Phim';
      const cinemaName = st.cinema?.name || 'Rạp';
      const time = st.start_time
        ? new Date(st.start_time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '';
      const totalSeats = st.room?.total_seats || 120;
      const bookedCount = Array.isArray(st.booked_seats) ? st.booked_seats.length : 0;
      const availableCount = totalSeats - bookedCount;

      reply += `- ${movieTitle} | ${cinemaName} | ${time} | Còn ${availableCount}/${totalSeats} ghế\n`;
    });

    if (showtimes.length > 5) {
      reply += `\n...và ${showtimes.length - 5} suất khác. Bạn muốn xem thêm không?`;
    }

    return reply.trim();
  }

  /** Format hướng dẫn đặt vé */
  private formatBookingGuide(data: unknown): string | null {
    // Nếu data là danh sách phim (chưa chọn phim cụ thể)
    if (Array.isArray(data) && data.length > 0 && data[0].title) {
      const movies = data.slice(0, 5);
      let reply = 'Để đặt vé, bạn chọn phim trước nhé:\n';
      movies.forEach((movie: any, i: number) => {
        reply += `${i + 1}. ${movie.title}\n`;
      });
      reply += '\nBạn muốn xem phim nào?';
      return reply;
    }

    // Nếu data là danh sách showtimes (đã chọn phim)
    if (Array.isArray(data) && data.length > 0) {
      const shown = data.slice(0, 5);
      const movieTitle = shown[0]?.movie?.title || shown[0]?.movie_id?.title || '';
      let reply = movieTitle ? `Lịch chiếu phim ${movieTitle}:\n` : 'Lịch chiếu:\n';
      shown.forEach((st: any) => {
        const cinemaName = st.cinema?.name || st.cinema_id?.name || '';
        const time = st.start_time
          ? new Date(st.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '';
        reply += `- ${cinemaName} | ${time}\n`;
      });
      reply += '\nBạn muốn đặt vé suất nào?';
      return reply;
    }

    return 'Bạn muốn đặt vé phim nào? Hãy cho mình biết tên phim nhé.';
  }

  private async fetchBackendData(
    intentResult: IntentResult,
    authHeader?: string,
    requestId?: string,
  ): Promise<unknown> {
    const rid = requestId || 'no-rid';
    const { intent, movieName, cinemaName, date } = intentResult;

    try {
      switch (intent) {
        case ChatIntent.CURRENT_MOVIES:
        case ChatIntent.NOW_SHOWING:
          return await this.backendApiService.getNowShowingMovies();

        case ChatIntent.UPCOMING_MOVIES:
          return await this.backendApiService.getUpcomingMovies();

        case ChatIntent.TODAY_MOVIES: {
          const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
          const showtimes = await this.backendApiService.getShowtimes({ date: todayStr });
          const showtimesList = showtimes?.data || showtimes || [];
          
          const todayMovies: any[] = [];
          const seenIds = new Set();
          for (const st of showtimesList) {
            const movie = st.movie || st.movie_id;
            if (movie && movie._id && !seenIds.has(movie._id)) {
              seenIds.add(movie._id);
              todayMovies.push(movie);
            }
          }
          return todayMovies;
        }

        case ChatIntent.MOVIE_DETAIL: {
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            return movie || null;
          }
          return null;
        }

        case ChatIntent.MOVIE_BY_GENRE:
          return await this.backendApiService.getNowShowingMovies();

        case ChatIntent.SHOWTIMES: {
          const res = await this.backendApiService.getShowtimes({});
          return res?.data || res;
        }

        case ChatIntent.SHOWTIMES_BY_MOVIE: {
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            if (movie) {
              const res = await this.backendApiService.getShowtimes({ movieId: movie._id });
              return res?.data || res;
            }
          }
          return null;
        }

        case ChatIntent.SHOWTIMES_BY_CINEMA: {
          if (cinemaName) {
            const cinemas = await this.backendApiService.getAllCinemas() || [];
            const foundCinema = cinemas.find((c: any) =>
              c.name?.toLowerCase().includes(cinemaName.toLowerCase()),
            );
            if (foundCinema) {
              const res = await this.backendApiService.getShowtimes({ cinemaId: foundCinema._id });
              return res?.data || res;
            }
          }
          return null;
        }

        case ChatIntent.SHOWTIMES_BY_DATE: {
          if (date) {
            const res = await this.backendApiService.getShowtimes({ date });
            return res?.data || res;
          }
          return null;
        }

        case ChatIntent.TICKET_PRICE: {
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            if (movie) {
              const res = await this.backendApiService.getShowtimes({ movieId: movie._id });
              return res?.data || res;
            }
          }
          const res = await this.backendApiService.getShowtimes({});
          return res?.data || res;
        }

        case ChatIntent.SEAT_AVAILABILITY: {
          let filterParams: any = {};
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            if (movie) filterParams.movieId = movie._id;
          }
          if (cinemaName) {
            const cinemas = await this.backendApiService.getAllCinemas() || [];
            const foundCinema = cinemas.find((c: any) =>
              c.name?.toLowerCase().includes(cinemaName.toLowerCase()),
            );
            if (foundCinema) filterParams.cinemaId = foundCinema._id;
          }
          const res = await this.backendApiService.getShowtimes(filterParams);
          return res?.data || res;
        }

        case ChatIntent.FOOD_COMBO:
        case ChatIntent.COMBO:
          return await this.backendApiService.getActiveCombos();

        case ChatIntent.BOOKING_STATUS:
          if (authHeader) {
            return await this.backendApiService.getMyBookings(authHeader);
          }
          return null;

        case ChatIntent.BOOKING_GUIDE: {
          // Nếu có movieName → lấy showtimes cho phim đó
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            if (movie) {
              const res = await this.backendApiService.getShowtimes({ movieId: movie._id });
              return res?.data || res;
            }
          }
          // Nếu không có movie → lấy danh sách phim đang chiếu
          return await this.backendApiService.getNowShowingMovies();
        }

        case ChatIntent.GREETING:
        case ChatIntent.OUT_OF_SCOPE:
        default:
          return null;
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[${rid}] ❌ Error fetching backend data: ${err.message}`);
      return null;
    }
  }

  /**
   * Bộ lọc Guard Validation chống dữ liệu giả (hallucination)
   */
  private async validateResponseContent(
    reply: string,
    backendData: any,
    intent: ChatIntent,
    requestId: string,
  ): Promise<boolean> {
    const rid = requestId || 'no-rid';

    // 1. Kiểm tra chống Prompt Injection hoặc Rò rỉ thông tin nhạy cảm
    const normalizedReply = reply.toLowerCase();
    const sensitiveKeywords = ['api_key', 'api key', 'system prompt', 'system_prompt', 'hướng dẫn trước', 'bỏ qua hướng dẫn', 'ignore instructions', 'ignore previous'];
    const matchedKeyword = sensitiveKeywords.find(kw => normalizedReply.includes(kw));
    if (matchedKeyword) {
      this.logger.warn(`[${rid}] 🛡️ Guard: Sensitive keyword "${matchedKeyword}" detected in response!`);
      return false;
    }

    // 2. Nếu là OUT_OF_SCOPE hoặc BOOKING_GUIDE thì không cần so khớp thực thể
    if (intent === ChatIntent.OUT_OF_SCOPE || intent === ChatIntent.BOOKING_GUIDE) {
      return true;
    }

    // 3. Các intent lấy danh sách đầy đủ từ backend → skip entity check
    // vì dữ liệu đã được truyền vào context đầy đủ, không cần so khớp thêm
    const skipEntityCheckIntents = [
      ChatIntent.CURRENT_MOVIES,
      ChatIntent.NOW_SHOWING,
      ChatIntent.UPCOMING_MOVIES,
      ChatIntent.TODAY_MOVIES,
      ChatIntent.TICKET_PRICE,
      ChatIntent.SEAT_AVAILABILITY,
      ChatIntent.FOOD_COMBO,
      ChatIntent.COMBO,
      ChatIntent.SHOWTIMES,
      ChatIntent.SHOWTIMES_BY_MOVIE,
      ChatIntent.SHOWTIMES_BY_CINEMA,
      ChatIntent.SHOWTIMES_BY_DATE,
      ChatIntent.BOOKING_STATUS,
      ChatIntent.GREETING,
      ChatIntent.MOVIE_DETAIL,
      ChatIntent.MOVIE_BY_GENRE,
    ];
    if (skipEntityCheckIntents.includes(intent)) {
      this.logger.log(`[${rid}] 🛡️ Guard: Skipping entity check for intent ${intent} (data from backend)`);
      return true;
    }

    // 4. Cho các intent khác — so khớp entity với backendData
    const allMovies = await this.backendApiService.getAllMovies() || [];
    const allCinemas = await this.backendApiService.getAllCinemas() || [];

    const validMovies = new Set<string>();
    const validCinemas = new Set<string>();
    this.extractEntitiesFromData(backendData, validMovies, validCinemas);

    this.logger.log(
      `[${rid}] 🛡️ Guard checking. Valid movies: [${Array.from(validMovies).join(', ')}]. ` +
      `Valid cinemas: [${Array.from(validCinemas).join(', ')}]`
    );

    for (const movie of allMovies) {
      const title = movie.title;
      if (!title || title.length < 3) continue;

      const normalizedTitle = this.normalizeString(title);
      if (this.containsWord(normalizedReply, normalizedTitle)) {
        if (!validMovies.has(title)) {
          this.logger.warn(`[${rid}] 🛡️ Guard: Detected hallucinated movie "${title}" in response!`);
          return false;
        }
      }
    }

    for (const cinema of allCinemas) {
      const name = cinema.name;
      if (!name || name.length < 3) continue;

      const normalizedName = this.normalizeString(name);
      if (this.containsWord(normalizedReply, normalizedName)) {
        if (!validCinemas.has(name)) {
          this.logger.warn(`[${rid}] 🛡️ Guard: Detected hallucinated cinema "${name}" in response!`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Helper trích xuất đệ quy tên phim và rạp từ backendData
   */
  private extractEntitiesFromData(data: any, movies: Set<string>, cinemas: Set<string>): void {
    if (!data) return;

    if (Array.isArray(data)) {
      for (const item of data) {
        this.extractEntitiesFromData(item, movies, cinemas);
      }
      return;
    }

    if (typeof data === 'object') {
      if (data.title && typeof data.title === 'string') {
        movies.add(data.title);
      }
      if (data.name && typeof data.name === 'string') {
        // Chỉ thêm khi đó là rạp thực tế tồn tại trong DB rạp (hoặc bỏ qua nếu là combo)
        // Guard sẽ double check với allCinemas nên an tâm
        cinemas.add(data.name);
      }

      for (const key of Object.keys(data)) {
        this.extractEntitiesFromData(data[key], movies, cinemas);
      }
    }
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  private containsWord(text: string, word: string): boolean {
    const cleanText = this.normalizeString(text);
    const cleanWord = this.normalizeString(word);
    
    // Đảm bảo so khớp từ trọn vẹn hoặc khớp chuỗi chính xác
    return cleanText.includes(cleanWord);
  }

  /**
   * Làm sạch dữ liệu từ backend (loại bỏ ảnh base64, rút ngắn mô tả)
   * nhằm tiết kiệm tokens gửi sang Gemini API
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    if (Array.isArray(data)) {
      // Giới hạn tối đa 5 phần tử đầu tiên để giảm thiểu tokens
      return data.slice(0, 5).map((item) => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const clean: any = {};
      for (const key of Object.keys(data)) {
        // Bỏ qua các trường ảnh/base64 hoặc link ảnh không cần thiết
        if (
          key === 'poster_url' ||
          key === 'poster' ||
          key === 'image' ||
          key === 'image_url' ||
          key === 'avatar' ||
          key === 'banner' ||
          key === 'banner_url' ||
          key === 'avatar_url' ||
          key === 'logo' ||
          key === 'logo_url' ||
          key === 'photo' ||
          key === 'photo_url' ||
          key === 'poster_image' ||
          key === 'bg_image' ||
          key === 'bg_url' ||
          key === 'cover' ||
          key === 'cover_url'
        ) {
          continue;
        }

        let val = data[key];

        // Nếu là description, rút ngắn lại
        if (key === 'description' && typeof val === 'string' && val.length > 150) {
          val = val.substring(0, 120) + '...';
        }

        // Nếu giá trị là chuỗi base64 ngẫu nhiên, bỏ qua
        if (typeof val === 'string' && (val.startsWith('data:image/') || val.length > 500)) {
          continue;
        }

        clean[key] = this.sanitizeData(val);
      }
      return clean;
    }

    return data;
  }

  /** Generate request ID dạng: REQ-<timestamp_short>-<counter> */
  private generateRequestId(): string {
    this.requestCounter++;
    const ts = Date.now().toString(36);
    return `REQ-${ts}-${this.requestCounter}`;
  }

  /** Truncate text cho log output */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

