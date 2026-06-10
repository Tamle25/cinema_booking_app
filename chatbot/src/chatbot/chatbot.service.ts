import { Injectable, Logger } from '@nestjs/common';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';
import { ChatbotResponse, ChatIntent, GeminiResult, IntentResult, ChatContext, ResponseSource } from './types/chatbot.types';
import { IntentService } from '../intent/intent.service';
import { BackendApiService } from '../backend-api/backend-api.service';
import { GeminiService } from '../gemini/gemini.service';
import { MAX_MESSAGE_LENGTH } from '../gemini/gemini.constants';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  private contexts = new Map<string, ChatContext>();

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
    const { message, conversationId, isAuthenticated } = dto;
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    let context = this.contexts.get(conversationId);
    if (!context) {
      context = {};
      this.contexts.set(conversationId, context);
    }

    const truncatedMessage =
      message.length > MAX_MESSAGE_LENGTH
        ? message.substring(0, MAX_MESSAGE_LENGTH)
        : message;

    let intentResult: IntentResult | undefined = undefined;

    try {
      const ruleResult = this.intentService.classify(truncatedMessage);
      intentResult = { ...ruleResult };

      if (ruleResult.intent === ChatIntent.OUT_OF_SCOPE) {
        const nluResult = await this.geminiService.classifyIntent(truncatedMessage, requestId);
        if (nluResult && nluResult.intent && nluResult.intent !== ChatIntent.OUT_OF_SCOPE) {
          intentResult = nluResult;
        }
      }

      const lowerMessage = truncatedMessage.toLowerCase();
      
      if (intentResult.intent === ChatIntent.OUT_OF_SCOPE || truncatedMessage.length < 20) {
        const allMovies = await this.backendApiService.getAllMovies() || [];
        const matchedMovie = allMovies.find((m: any) => 
          lowerMessage.includes(this.normalizeString(m.title)) ||
          this.normalizeString(m.title).includes(lowerMessage)
        );

        if (matchedMovie) {
          intentResult.movieName = matchedMovie.title;
          if (context.lastIntent === ChatIntent.BOOKING_GUIDE || context.lastIntent === ChatIntent.SHOWTIMES) {
            intentResult.intent = context.lastIntent as ChatIntent;
          } else {
            intentResult.intent = ChatIntent.MOVIE_DETAIL;
          }
        } else {
          const allCinemas = await this.backendApiService.getAllCinemas() || [];
          const matchedCinema = allCinemas.find((c: any) => 
            lowerMessage.includes(this.normalizeString(c.name)) ||
            this.normalizeString(c.name).includes(lowerMessage)
          );

          if (matchedCinema) {
            intentResult.cinemaName = matchedCinema.name;
            intentResult.intent = context.lastIntent === ChatIntent.SEAT_STATUS ? ChatIntent.SEAT_STATUS : ChatIntent.SHOWTIMES;
          } else {
            const isShortWord = truncatedMessage.split(/\s+/).length <= 3 && !/không|ko|có|co|đâu|dau|nào|nao|gì|gi/.test(lowerMessage);
            if (isShortWord && context.lastIntent && (context.lastIntent === ChatIntent.BOOKING_GUIDE || context.lastIntent === ChatIntent.SHOWTIMES || context.lastIntent === ChatIntent.MOVIE_DETAIL)) {
              intentResult.movieName = truncatedMessage;
              intentResult.intent = context.lastIntent as ChatIntent;
            }
          }
        }
      }

      const isFollowUpQuestion = /thì sao|thi sao|rồi sao|roi sao|thế còn|the con|còn suất nào|ngày mai|tối nay|hôm nay|đã thanh toán|da thanh toan/.test(lowerMessage);
      if ((intentResult.intent === ChatIntent.OUT_OF_SCOPE || intentResult.intent === ChatIntent.NAVIGATION_REQUEST) && isFollowUpQuestion && context.lastIntent) {
        intentResult.intent = context.lastIntent as ChatIntent;
      }

      const isContextDependentMovie = /phim này|phim đó|phim đấy|bộ phim này|bộ phim đó|suất chiếu phim này|lịch chiếu phim này/.test(lowerMessage);
      const isContextDependentCinema = /rạp này|rạp đó|ở rạp đó|tại rạp này/.test(lowerMessage);
      const isContextDependentDate = /hôm nay|ngày mai|tối nay|chiếu ngày này|suất này/.test(lowerMessage);

      if (!intentResult.movieName && (isContextDependentMovie || isFollowUpQuestion || !intentResult.movieName) && context.lastMovieName) {
        const movieNeededIntents = [
          ChatIntent.MOVIE_DETAIL,
          ChatIntent.SHOWTIMES,
          ChatIntent.SEAT_STATUS,
          ChatIntent.TICKET_PRICE,
          ChatIntent.BOOKING_GUIDE
        ];
        if (movieNeededIntents.includes(intentResult.intent) || isContextDependentMovie) {
          intentResult.movieName = context.lastMovieName;
        }
      }

      if (!intentResult.cinemaName && (isContextDependentCinema || isFollowUpQuestion || !intentResult.cinemaName) && context.lastCinemaName) {
        if (intentResult.intent === ChatIntent.SHOWTIMES || intentResult.intent === ChatIntent.SEAT_STATUS || intentResult.intent === ChatIntent.CINEMA_QUERY || isContextDependentCinema) {
          intentResult.cinemaName = context.lastCinemaName;
        }
      }

      if (!intentResult.date && (isContextDependentDate || isFollowUpQuestion || !intentResult.date) && context.lastDate) {
        if (intentResult.intent === ChatIntent.SHOWTIMES || intentResult.intent === ChatIntent.SEAT_STATUS || isContextDependentDate) {
          intentResult.date = context.lastDate;
        }
      }

      if (lowerMessage.includes('khác không') || lowerMessage.includes('khác ko') || lowerMessage.includes('còn phim nào nữa') || lowerMessage.includes('phim khác')) {
        if (context.lastGenre) {
          intentResult.intent = ChatIntent.MOVIE_BY_GENRE;
          intentResult.genre = context.lastGenre;
        } else if (context.lastIntent === ChatIntent.NOW_SHOWING) {
          intentResult.intent = ChatIntent.NOW_SHOWING;
        }
      }

      if (intentResult.intent === ChatIntent.BOOKING_STATUS && !isAuthenticated) {
        const reply = 'Bạn cần đăng nhập để xem vé đã đặt hoặc lịch sử đặt vé.';
        const actions = [{ type: 'NAVIGATE' as const, label: 'Đăng nhập', url: '/profile/bookings' }];
        const suggestions = ['Hôm nay có phim gì?', 'Xem lịch chiếu', 'Voucher khuyến mãi'];
        
        context.lastIntent = intentResult.intent;
        this.contexts.set(conversationId, context);

        return {
          success: true,
          reply,
          conversationId,
          intent: intentResult.intent,
          suggestions,
          actions,
          source: 'rule'
        };
      }

      if (intentResult.intent === ChatIntent.OUT_OF_SCOPE) {
        const reply = 'Mình chỉ hỗ trợ thông tin phim, lịch chiếu, giá vé, ghế trống, bắp nước và chính sách hoàn/hủy vé của CineMax. Bạn muốn tìm phim hay đặt vé phim nào?';
        const suggestions = ['Hôm nay có phim gì?', 'Xem lịch chiếu', 'Khuyến mãi hè'];

        return {
          success: true,
          reply,
          conversationId,
          intent: intentResult.intent,
          suggestions,
          actions: [],
          source: 'rule'
        };
      }

      let backendData: any = null;

      if (intentResult.intent === ChatIntent.FAQ_POLICY) {
        const faqItem = this.findFAQItem(truncatedMessage);
        if (faqItem) {
          backendData = faqItem;
        }
      } else {
        backendData = await this.fetchBackendData(intentResult, authHeader, requestId);
      }

      const sanitizedBackendData = this.sanitizeData(backendData);

      let finalReply = '';
      let responseSource: ResponseSource = 'gemini';
      let modelUsed = '';

      try {
        const geminiResult = await this.geminiService.generateReply({
          userMessage: truncatedMessage,
          intent: intentResult.intent,
          isAuthenticated: isAuthenticated || false,
          backendData: sanitizedBackendData,
          context,
          requestId,
        });

        if (geminiResult.source === 'gemini') {
          finalReply = geminiResult.text;
          modelUsed = geminiResult.model || '';
        } else {
          responseSource = 'fallback';
          finalReply = this.formatRuleBasedResponse(intentResult.intent, backendData) || geminiResult.text;
        }
      } catch (geminiError) {
        responseSource = 'fallback';
        finalReply = this.formatRuleBasedResponse(intentResult.intent, backendData) || 'Mình chưa lấy được dữ liệu lúc này, bạn thử lại sau nhé.';
      }

      if (responseSource === 'gemini') {
        const isResponseValid = await this.validateResponseContent(
          finalReply,
          backendData,
          intentResult.intent,
          requestId,
        );
        if (!isResponseValid) {
          responseSource = 'fallback';
          finalReply = this.formatRuleBasedResponse(intentResult.intent, backendData) || 'Hiện chưa có thông tin phù hợp với rạp hoặc bộ phim này.';
        }
      }

      const actions: any[] = [];
      const suggestions: string[] = [];

      this.updateContextAndGenerateActions(intentResult, backendData, context, actions, suggestions);

      context.lastIntent = intentResult.intent;
      if (intentResult.genre) {
        context.lastGenre = intentResult.genre;
      }
      this.contexts.set(conversationId, context);

      return {
        success: true,
        reply: finalReply,
        conversationId,
        intent: intentResult.intent,
        suggestions: suggestions.slice(0, 5),
        actions,
        source: responseSource,
        model: modelUsed || undefined
      };
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[${requestId}] Lỗi xử lý tin nhắn sau ${elapsed}ms: ${error.message}`);
      return {
        success: false,
        reply: 'Xin lỗi, hiện tại chatbot đang gặp sự cố. Vui lòng thử lại sau.',
        conversationId,
        intent: intentResult?.intent || ChatIntent.OUT_OF_SCOPE,
        suggestions: ['Hôm nay có phim gì?', 'Xem lịch chiếu'],
        actions: [],
        source: 'fallback',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  private findFAQItem(message: string): any {
    const normalized = message.toLowerCase();
    const faqData = require('../prompts/faq-data').FAQ_DATA;
    
    for (const item of faqData) {
      const match = item.keywords.some((kw: string) => normalized.includes(kw.toLowerCase()));
      if (match) {
        return item;
      }
    }
    return null;
  }

  private updateContextAndGenerateActions(
    intentResult: IntentResult,
    backendData: any,
    context: ChatContext,
    actions: any[],
    suggestions: string[]
  ) {
    const { intent } = intentResult;

    let movie: any = null;
    if (intent === ChatIntent.MOVIE_DETAIL || intent === ChatIntent.BOOKING_GUIDE || intent === ChatIntent.SHOWTIMES || intent === ChatIntent.TICKET_PRICE || intent === ChatIntent.SEAT_STATUS) {
      if (backendData) {
        if (Array.isArray(backendData) && backendData.length > 0) {
          const first = backendData[0];
          movie = first.movie || first.movie_id || (first.title ? first : null);
        } else if (backendData.title) {
          movie = backendData;
        }
      }
    }

    if (movie && movie._id) {
      context.lastMovieId = movie._id;
      context.lastMovieName = movie.title;
      context.lastMovieSlug = movie.slug || '';
    }

    let cinema: any = null;
    if (intent === ChatIntent.CINEMA_QUERY || intent === ChatIntent.SHOWTIMES || intent === ChatIntent.SEAT_STATUS) {
      if (backendData) {
        if (Array.isArray(backendData) && backendData.length > 0) {
          const first = backendData[0];
          cinema = first.cinema || first.cinema_id || (first.name ? first : null);
        } else if (backendData.name) {
          cinema = backendData;
        }
      }
    }
    if (cinema && cinema._id) {
      context.lastCinemaId = cinema._id;
      context.lastCinemaName = cinema.name;
    }

    let showtime: any = null;
    if (intent === ChatIntent.SHOWTIMES || intent === ChatIntent.SEAT_STATUS) {
      if (backendData && Array.isArray(backendData) && backendData.length > 0) {
        showtime = backendData[0];
      }
    }
    if (showtime && showtime._id) {
      context.lastShowtimeId = showtime._id;
    }

    if (intentResult.date) {
      context.lastDate = intentResult.date;
    }

    if (context.lastMovieId) {
      const id = context.lastMovieId;
      if (intent === ChatIntent.MOVIE_DETAIL) {
        actions.push({ type: 'NAVIGATE', label: 'Xem chi tiết phim', url: `/movies/${id}` });
        actions.push({ type: 'NAVIGATE', label: 'Xem lịch chiếu', url: `/showtimes?movieId=${id}` });
        actions.push({ type: 'NAVIGATE', label: 'Đặt vé ngay', url: `/booking?movieId=${id}` });
      } else if (intent === ChatIntent.SHOWTIMES) {
        actions.push({ type: 'NAVIGATE', label: 'Xem lịch chiếu', url: `/showtimes?movieId=${id}` });
        actions.push({ type: 'NAVIGATE', label: 'Đặt vé ngay', url: `/booking?movieId=${id}` });
      } else if (intent === ChatIntent.BOOKING_GUIDE) {
        actions.push({ type: 'NAVIGATE', label: 'Đặt vé ngay', url: `/booking?movieId=${id}` });
      }
    }

    if (context.lastShowtimeId && (intent === ChatIntent.SEAT_STATUS || intent === ChatIntent.SHOWTIMES)) {
      actions.push({ type: 'NAVIGATE', label: 'Chọn ghế', url: `/booking/seats?showtimeId=${context.lastShowtimeId}` });
    }

    if (intent === ChatIntent.BOOKING_STATUS) {
      actions.push({ type: 'NAVIGATE', label: 'Vé của tôi', url: '/profile/bookings' });
    }

    if (intent === ChatIntent.PROMOTION) {
      actions.push({ type: 'NAVIGATE', label: 'Xem khuyến mãi', url: '/promotions' });
    }

    if (intent === ChatIntent.FAQ_POLICY) {
      if (backendData && backendData.url) {
        actions.push({ type: 'NAVIGATE', label: backendData.label || 'Xem chi tiết', url: backendData.url });
      }
    }

    if (intent === ChatIntent.NAVIGATION_REQUEST) {
      const lowerMsg = intentResult.extractedKeyword?.toLowerCase() || '';
      const cleanMsg = this.normalizeString(lowerMsg);
      if (cleanMsg.includes('thanh toan') || cleanMsg.includes('checkout')) {
        actions.push({ type: 'NAVIGATE', label: 'Thanh toán', url: '/checkout' });
      } else if (cleanMsg.includes('tin tuc') || cleanMsg.includes('news')) {
        actions.push({ type: 'NAVIGATE', label: 'Xem tin tức', url: '/news' });
      } else if (cleanMsg.includes('khuyen mai') || cleanMsg.includes('promotions')) {
        actions.push({ type: 'NAVIGATE', label: 'Xem khuyến mãi', url: '/promotions' });
      } else if (cleanMsg.includes('ve') || cleanMsg.includes('bookings') || cleanMsg.includes('lich su')) {
        actions.push({ type: 'NAVIGATE', label: 'Vé của tôi', url: '/profile/bookings' });
      } else {
        actions.push({ type: 'NAVIGATE', label: 'Trang cá nhân', url: '/profile/bookings' });
      }
    }

    if (intent === ChatIntent.GREETING) {
      suggestions.push('Hôm nay có phim gì?', 'Phim sắp chiếu?', 'Khuyến mãi cuối tuần');
    } else if (intent === ChatIntent.NOW_SHOWING || intent === ChatIntent.UPCOMING_MOVIES || intent === ChatIntent.MOVIE_BY_GENRE) {
      if (context.lastMovieName) {
        suggestions.push(`Lịch chiếu phim ${context.lastMovieName}`, `Xem chi tiết phim ${context.lastMovieName}`, 'Đặt vé phim này');
      } else {
        suggestions.push('Xem lịch chiếu hôm nay', 'Có phim hành động không?', 'Voucher khuyến mãi');
      }
    } else if (intent === ChatIntent.MOVIE_DETAIL) {
      suggestions.push(`Lịch chiếu phim ${context.lastMovieName}`, 'Đặt vé phim này', 'Giá vé bao nhiêu?');
    } else if (intent === ChatIntent.SHOWTIMES) {
      suggestions.push('Đặt vé phim này', 'Còn ghế không?', 'Vé của tôi');
    } else if (intent === ChatIntent.BOOKING_GUIDE) {
      suggestions.push('Chọn ghế ngồi', 'Thanh toán như thế nào?', 'Có voucher giảm giá không?');
    } else if (intent === ChatIntent.FAQ_POLICY) {
      suggestions.push('Làm thế nào để đặt vé?', 'Đã thanh toán rồi hoàn vé thế nào?', 'Chương trình thành viên');
    } else {
      suggestions.push('Hôm nay có phim gì?', 'Xem lịch chiếu', 'Khuyến mãi hôm nay');
    }
  }

  private formatRuleBasedResponse(intent: ChatIntent, data: unknown): string | null {
    try {
      switch (intent) {
        case ChatIntent.NOW_SHOWING:
          return this.formatMovieList(data, 'đang chiếu');

        case ChatIntent.UPCOMING_MOVIES:
          return this.formatMovieList(data, 'sắp chiếu');

        case ChatIntent.MOVIE_BY_GENRE:
          return this.formatMovieList(data, 'theo thể loại');

        case ChatIntent.SHOWTIMES:
          return this.formatShowtimes(data);

        case ChatIntent.BOOKING_STATUS:
          return this.formatBookingStatus(data);

        case ChatIntent.TICKET_PRICE:
          return this.formatTicketPrice(data);

        case ChatIntent.SEAT_STATUS:
          return this.formatSeatAvailability(data);

        case ChatIntent.MOVIE_DETAIL:
          return this.formatMovieDetail(data);

        case ChatIntent.CINEMA_QUERY:
          return this.formatCinemas(data);

        case ChatIntent.PROMOTION:
          return this.formatPromotions(data);

        case ChatIntent.FAQ_POLICY:
          return this.formatFAQ(data);

        case ChatIntent.BOOKING_GUIDE:
          return this.formatBookingGuide(data);

        case ChatIntent.GREETING:
          return 'Xin chào! Mình là chatbot hỗ trợ đặt vé xem phim CineMax. Bạn cần hỗ trợ gì về phim, lịch chiếu, giá vé hay khuyến mãi không?';

        case ChatIntent.NAVIGATION_REQUEST:
          return 'Mình đã chuẩn bị liên kết điều hướng đến trang bạn yêu cầu. Bạn bấm nút bên dưới để chuyển trang nhanh nhé.';

        default:
          return null;
      }
    } catch {
      return null;
    }
  }

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

  private formatMovieList(data: unknown, type: string): string | null {
    if (!Array.isArray(data) || data.length === 0) {
      return `Hiện chưa có phim ${type} nào.`;
    }

    const movies = data.slice(0, 5);
    let reply = `Phim ${type}:\n`;
    movies.forEach((movie: any, i: number) => {
      reply += `${i + 1}. **${movie.title || 'Chưa có tên'}**`;
      if (movie.genre) reply += ` — ${movie.genre}`;
      if (movie.duration) reply += ` — ${movie.duration} phút`;
      reply += '\n';
    });

    if (data.length > 5) {
      reply += `\n...và ${data.length - 5} phim khác.`;
    }

    reply += `\nBạn muốn xem lịch chiếu phim nào?`;
    return reply;
  }

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
      const dateStr = st.start_time
        ? new Date(st.start_time).toLocaleDateString('vi-VN')
        : '';
      reply += `- **${movieName}** | Rạp: ${cinemaName} | Suất: ${time} (${dateStr})\n`;
    });

    if (showtimes.length > 5) {
      reply += `\n...và ${showtimes.length - 5} suất khác.`;
    }
    reply += '\nBạn muốn đặt vé suất nào?';
    return reply;
  }

  private formatBookingStatus(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) {
      return 'Bạn chưa có đơn đặt vé nào.';
    }

    const bookings = data.slice(0, 5);
    let reply = 'Danh sách vé đã đặt:\n';
    bookings.forEach((booking: any, i: number) => {
      const movieTitle = booking.showtime?.movie?.title || 'Phim';
      const cinemaName = booking.showtime?.cinema?.name || 'Rạp';
      const time = booking.showtime?.start_time
        ? new Date(booking.showtime.start_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
        : '';
      const seats = Array.isArray(booking.seats) ? booking.seats.join(', ') : '';
      const status = booking.status === 'PAID' ? 'Đã thanh toán' : booking.status === 'PENDING' ? 'Chờ thanh toán' : 'Đã hủy';

      reply += `${i + 1}. **${movieTitle}** | Rạp: ${cinemaName} | Ghế: ${seats}\n`;
      reply += `   Suất chiếu: ${time} | Trạng thái: ${status}\n`;
    });

    return reply.trim();
  }

  private formatTicketPrice(data: unknown): string {
    const showtimes = Array.isArray(data) ? data : [];
    if (showtimes.length === 0) {
      return 'Hiện chưa có thông tin giá vé cụ thể. Bạn thử chọn phim cụ thể hơn nhé.';
    }

    const first = showtimes[0];
    const movieTitle = first.movie?.title || first.movie_id?.title || '';
    let reply = movieTitle ? `Giá vé phim **${movieTitle}**:\n` : 'Giá vé:\n';
    
    const prices = [...new Set(showtimes.map((st: any) => st.price))].filter(Boolean);
    if (prices.length > 0) {
      prices.forEach((price: any) => {
        reply += `- ${Number(price).toLocaleString('vi-VN')}đ\n`;
      });
    } else {
      reply += '- 75.000đ - 90.000đ (tùy vào suất chiếu và rạp)';
    }

    return reply;
  }

  private formatSeatAvailability(data: unknown): string {
    const showtimes = Array.isArray(data) ? data : [];
    if (showtimes.length === 0) {
      return 'Không tìm thấy suất chiếu phù hợp. Bạn chọn phim và rạp cụ thể hơn nhé.';
    }

    let reply = 'Trạng thái ghế trống của các suất chiếu:\n';
    const limit = showtimes.slice(0, 5);
    limit.forEach((st: any) => {
      const movieTitle = st.movie?.title || st.movie_id?.title || 'Phim';
      const cinemaName = st.cinema?.name || st.cinema_id?.name || 'Rạp';
      const time = st.start_time
        ? new Date(st.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '';
      const totalSeats = st.room?.total_seats || 120;
      const bookedCount = Array.isArray(st.booked_seats) ? st.booked_seats.length : 0;
      const availableCount = totalSeats - bookedCount;

      reply += `- **${movieTitle}** | Rạp: ${cinemaName} | Suất: ${time} | Còn ${availableCount}/${totalSeats} ghế trống\n`;
    });

    return reply.trim();
  }

  private formatCinemas(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
      return 'Hiện tại chưa có thông tin rạp chiếu.';
    }
    let reply = 'Danh sách rạp chiếu phim đối tác:\n';
    data.slice(0, 5).forEach((cinema: any, i: number) => {
      reply += `${i + 1}. **${cinema.name}**\n`;
      if (cinema.address) reply += `   Địa chỉ: ${cinema.address}\n`;
    });
    return reply;
  }

  private formatPromotions(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
      return 'Hiện tại chưa có chương trình khuyến mãi nào hoạt động.';
    }
    let reply = 'Các chương trình khuyến mãi và mã giảm giá đang hoạt động:\n';
    data.slice(0, 5).forEach((promo: any, i: number) => {
      reply += `${i + 1}. **${promo.name}**\n`;
      if (promo.code) reply += `   Mã giảm giá: \`${promo.code}\`\n`;
      if (promo.description) reply += `   Mô tả: ${promo.description}\n`;
    });
    return reply;
  }

  private formatFAQ(data: any): string {
    if (!data) return 'Hiện chưa có thông tin phù hợp.';
    return `**${data.question}**\n\n${data.answer}`;
  }

  private formatBookingGuide(data: unknown): string | null {
    if (Array.isArray(data) && data.length > 0 && (data[0].title || data[0].movie)) {
      const movies = data.slice(0, 5);
      let reply = 'Để đặt vé, bạn chọn phim trước nhé:\n';
      movies.forEach((item: any, i: number) => {
        const title = item.title || item.movie?.title || 'Phim';
        reply += `${i + 1}. **${title}**\n`;
      });
      reply += '\nBạn muốn xem phim nào?';
      return reply;
    }
    return 'Để đặt vé xem phim trên website, bạn chọn phim từ danh sách phim đang chiếu, sau đó chọn rạp, suất chiếu, ghế trống và tiến hành thanh toán trực tuyến.';
  }

  private async fetchBackendData(
    intentResult: IntentResult,
    authHeader?: string,
    requestId?: string,
  ): Promise<unknown> {
    const rid = requestId || 'no-rid';
    const { intent, movieName, cinemaName, date, genre } = intentResult;

    try {
      switch (intent) {
        case ChatIntent.NOW_SHOWING:
          return await this.backendApiService.getNowShowingMovies();

        case ChatIntent.UPCOMING_MOVIES:
          return await this.backendApiService.getUpcomingMovies();

        case ChatIntent.MOVIE_BY_GENRE: {
          const movies = await this.backendApiService.getNowShowingMovies();
          if (genre && Array.isArray(movies)) {
            const normalizedGenre = genre.toLowerCase().trim();
            return movies.filter((m: any) => 
              m.genre?.toLowerCase().includes(normalizedGenre)
            );
          }
          return movies;
        }

        case ChatIntent.MOVIE_DETAIL: {
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            return movie || null;
          }
          return null;
        }

        case ChatIntent.SHOWTIMES: {
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
          if (date) {
            filterParams.date = date;
          }
          const res = await this.backendApiService.getShowtimes(filterParams);
          return res?.data || res;
        }

        case ChatIntent.CINEMA_QUERY: {
          const cinemas = await this.backendApiService.getAllCinemas() || [];
          if (cinemaName) {
            const found = cinemas.filter((c: any) =>
              c.name?.toLowerCase().includes(cinemaName.toLowerCase())
            );
            return found.length > 0 ? found : cinemas;
          }
          return cinemas;
        }

        case ChatIntent.SEAT_STATUS: {
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
          if (date) {
            filterParams.date = date;
          }
          const res = await this.backendApiService.getShowtimes(filterParams);
          return res?.data || res;
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

        case ChatIntent.BOOKING_GUIDE: {
          if (movieName) {
            const movie = await this.backendApiService.searchMovieByName(movieName);
            if (movie) {
              const res = await this.backendApiService.getShowtimes({ movieId: movie._id });
              return res?.data || res;
            }
          }
          return await this.backendApiService.getNowShowingMovies();
        }

        case ChatIntent.BOOKING_STATUS:
          if (authHeader) {
            return await this.backendApiService.getMyBookings(authHeader);
          }
          return null;

        case ChatIntent.PROMOTION:
          return await this.backendApiService.getActivePromotions();

        case ChatIntent.GREETING:
        case ChatIntent.OUT_OF_SCOPE:
        case ChatIntent.NAVIGATION_REQUEST:
        default:
          return null;
      }
    } catch (error: any) {
      this.logger.error(`[${rid}] Lỗi lấy dữ liệu backend: ${error.message}`);
      return null;
    }
  }

  private async validateResponseContent(
    reply: string,
    backendData: any,
    intent: ChatIntent,
    requestId: string,
  ): Promise<boolean> {
    const rid = requestId || 'no-rid';

    const normalizedReply = reply.toLowerCase();
    const sensitiveKeywords = ['api_key', 'api key', 'system prompt', 'system_prompt', 'hướng dẫn trước', 'bỏ qua hướng dẫn', 'ignore instructions', 'ignore previous'];
    const matchedKeyword = sensitiveKeywords.find(kw => normalizedReply.includes(kw));
    if (matchedKeyword) {
      this.logger.warn(`[${rid}] Response chứa từ khóa nhạy cảm: ${matchedKeyword}`);
      return false;
    }

    if (intent === ChatIntent.OUT_OF_SCOPE || intent === ChatIntent.BOOKING_GUIDE || intent === ChatIntent.FAQ_POLICY) {
      return true;
    }

    const skipEntityCheckIntents = [
      ChatIntent.NOW_SHOWING,
      ChatIntent.UPCOMING_MOVIES,
      ChatIntent.TICKET_PRICE,
      ChatIntent.SEAT_STATUS,
      ChatIntent.SHOWTIMES,
      ChatIntent.BOOKING_STATUS,
      ChatIntent.GREETING,
      ChatIntent.MOVIE_DETAIL,
      ChatIntent.MOVIE_BY_GENRE,
      ChatIntent.CINEMA_QUERY,
      ChatIntent.PROMOTION,
      ChatIntent.NAVIGATION_REQUEST
    ];
    if (skipEntityCheckIntents.includes(intent)) {
      return true;
    }

    const allMovies = await this.backendApiService.getAllMovies() || [];
    const allCinemas = await this.backendApiService.getAllCinemas() || [];

    const validMovies = new Set<string>();
    const validCinemas = new Set<string>();
    this.extractEntitiesFromData(backendData, validMovies, validCinemas);

    for (const movie of allMovies) {
      const title = movie.title;
      if (!title || title.length < 3) continue;

      const normalizedTitle = this.normalizeString(title);
      if (this.containsWord(normalizedReply, normalizedTitle)) {
        if (!validMovies.has(title)) {
          this.logger.warn(`[${rid}] Response nhắc đến phim ngoài dữ liệu: ${title}`);
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
          this.logger.warn(`[${rid}] Response nhắc đến rạp ngoài dữ liệu: ${name}`);
          return false;
        }
      }
    }

    return true;
  }

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
    return cleanText.includes(cleanWord);
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.slice(0, 5).map((item) => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const clean: any = {};
      for (const key of Object.keys(data)) {
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

        if (key === 'description' && typeof val === 'string' && val.length > 150) {
          val = val.substring(0, 120) + '...';
        }

        if (typeof val === 'string' && (val.startsWith('data:image/') || val.length > 500)) {
          continue;
        }

        clean[key] = this.sanitizeData(val);
      }
      return clean;
    }

    return data;
  }

  private generateRequestId(): string {
    this.requestCounter++;
    const ts = Date.now().toString(36);
    return `REQ-${ts}-${this.requestCounter}`;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
