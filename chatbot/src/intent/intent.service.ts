import { Injectable } from '@nestjs/common';
import { ChatIntent, IntentResult } from '../chatbot/types/chatbot.types';

@Injectable()
export class IntentService {
  /**
   * Phân loại intent từ tin nhắn người dùng (rule-based làm fallback)
   */
  classify(message: string): IntentResult {
    const normalized = this.normalize(message);
    const noAccent = this.removeAccents(normalized);

    // --- GREETING ---
    if (
      this.match(normalized, ['xin chào', 'chào bạn', 'hello', 'hi', 'bạn là ai', 'chatbot là ai', 'chào bot', 'bot ơi']) ||
      this.match(noAccent, ['xin chao', 'chao ban', 'ban la ai', 'chatbot la ai', 'chao bot', 'bot oi'])
    ) {
      return { intent: ChatIntent.GREETING };
    }

    // --- BOOKING_GUIDE ---
    if (
      this.match(normalized, ['đặt vé', 'mua vé', 'book vé', 'muốn đặt vé', 'muốn mua vé', 'muốn xem phim', 'đặt vé xem phim']) ||
      this.match(noAccent, ['dat ve', 'mua ve', 'book ve', 'muon dat ve', 'muon mua ve', 'muon xem phim', 'dat ve xem phim'])
    ) {
      const movieName = this.extractMovieName(normalized);
      return { intent: ChatIntent.BOOKING_GUIDE, movieName, extractedKeyword: movieName };
    }

    // --- BOOKING_STATUS ---
    if (
      this.match(normalized, ['vé của tôi', 'vé đã đặt', 'lịch sử đặt vé', 'booking của tôi', 'vé đã mua', 'xem vé', 'tra cứu vé', 'trạng thái đặt', 'trạng thái đơn', 'lịch sử mua']) ||
      this.match(noAccent, ['ve cua toi', 've da dat', 'lich su dat ve', 'booking cua toi', 've da mua', 'xem ve', 'tra cuu ve', 'trang thai dat', 'trang thai don'])
    ) {
      return { intent: ChatIntent.BOOKING_STATUS };
    }

    // --- SEAT_AVAILABILITY ---
    if (
      this.match(normalized, ['ghế', 'ghế trống', 'còn ghế', 'chỗ ngồi', 'ghế đôi', 'bao nhiêu ghế', 'còn chỗ', 'sơ đồ ghế', 'vị trí ngồi']) ||
      this.match(noAccent, ['ghe', 'ghe trong', 'con ghe', 'cho ngoi', 'ghe doi', 'bao nhieu ghe', 'con cho', 'so do ghe'])
    ) {
      return { intent: ChatIntent.SEAT_AVAILABILITY };
    }

    // --- TICKET_PRICE ---
    if (
      this.match(normalized, ['giá vé', 'bao nhiêu tiền', 'vé bao nhiêu', 'giá tiền vé', 'tiền vé', 'giá cả', 'bảng giá']) ||
      this.match(noAccent, ['gia ve', 'bao nhieu tien', 've bao nhieu', 'gia tien ve', 'tien ve', 'gia ca'])
    ) {
      const movieName = this.extractMovieName(normalized);
      return { intent: ChatIntent.TICKET_PRICE, movieName, extractedKeyword: movieName };
    }

    // --- FOOD_COMBO / COMBO ---
    if (
      this.match(normalized, ['combo', 'bắp', 'nước', 'đồ ăn', 'bắp nước', 'snack', 'popcorn', 'combo bắp', 'thức uống']) ||
      this.match(noAccent, ['combo', 'bap', 'nuoc', 'do an', 'bap nuoc', 'snack', 'popcorn'])
    ) {
      return { intent: ChatIntent.COMBO };
    }

    // --- MOVIE_DETAIL (trailer, tóm tắt, cốt truyện, review) ---
    if (
      this.match(normalized, ['tóm tắt', 'nội dung', 'trailer', 'cốt truyện', 'review', 'thông tin phim', 'giới thiệu phim', 'phim này nói về', 'trailer phim', 'tóm tắt phim']) ||
      this.match(noAccent, ['tom tat', 'noi dung', 'trailer', 'cot truyen', 'review', 'thong tin phim', 'gioi thieu phim', 'phim nay noi ve', 'trailer phim', 'tom tat phim'])
    ) {
      const movieName = this.extractMovieName(normalized);
      return { intent: ChatIntent.MOVIE_DETAIL, movieName, extractedKeyword: movieName };
    }

    // --- MOVIE_BY_GENRE ---
    if (
      this.match(normalized, ['phim hành động', 'phim kinh dị', 'phim hoạt hình', 'phim tình cảm', 'phim hài', 'phim viễn tưởng', 'phim tài liệu', 'phim phiêu lưu']) ||
      this.match(noAccent, ['phim hanh dong', 'phim kinh di', 'phim hoat hinh', 'phim tinh cam', 'phim hai', 'phim vien tuong', 'phim tai lieu', 'phim phieu luu'])
    ) {
      return { intent: ChatIntent.MOVIE_BY_GENRE };
    }

    // --- SHOWTIMES_BY_MOVIE ---
    if (
      this.match(normalized, ['lịch chiếu phim', 'suất chiếu phim', 'mấy giờ chiếu', 'phim chiếu mấy giờ', 'phim chiếu khi nào', 'lịch chiếu cho phim']) ||
      this.match(noAccent, ['lich chieu phim', 'suat chieu phim', 'may gio chieu', 'phim chieu may gio', 'phim chieu khi nao'])
    ) {
      const movieName = this.extractMovieName(normalized);
      return { intent: ChatIntent.SHOWTIMES_BY_MOVIE, movieName, extractedKeyword: movieName };
    }

    // --- SHOWTIMES_BY_CINEMA ---
    if (
      this.match(normalized, ['lịch chiếu rạp', 'suất chiếu rạp', 'rạp đang chiếu', 'ở rạp', 'lịch chiếu của rạp']) ||
      this.match(noAccent, ['lich chieu rap', 'suat chieu rap', 'rap dang chieu', 'o rap'])
    ) {
      const cinemaName = this.extractCinemaName(normalized);
      return { intent: ChatIntent.SHOWTIMES_BY_CINEMA, cinemaName, extractedKeyword: cinemaName };
    }

    // --- SHOWTIMES_BY_DATE ---
    if (
      this.match(normalized, ['lịch chiếu ngày', 'suất chiếu ngày', 'chiếu ngày', 'suất chiếu ngày mai', 'lịch chiếu ngày mai']) ||
      this.match(noAccent, ['lich chieu ngay', 'suat chieu ngay', 'chieu ngay'])
    ) {
      const date = this.extractDate(normalized);
      return { intent: ChatIntent.SHOWTIMES_BY_DATE, date };
    }

    // --- UPCOMING_MOVIES ---
    if (
      this.match(normalized, ['phim sắp chiếu', 'sắp ra mắt', 'coming soon', 'phim sắp ra', 'phim mới sắp', 'sắp chiếu']) ||
      this.match(noAccent, ['phim sap chieu', 'sap ra mat', 'phim sap ra', 'phim moi sap'])
    ) {
      return { intent: ChatIntent.UPCOMING_MOVIES };
    }

    // --- TODAY_MOVIES ---
    if (
      this.match(normalized, ['hôm nay chiếu phim gì', 'phim chiếu hôm nay', 'tối nay có suất', 'tối nay chiếu', 'suất chiếu tối nay']) ||
      this.match(noAccent, ['hom nay chieu phim gi', 'phim chieu hom nay', 'toi nay co suat', 'toi nay chieu'])
    ) {
      return { intent: ChatIntent.TODAY_MOVIES };
    }

    // --- SHOWTIMES (Lịch chiếu rạp nói chung) ---
    if (
      this.match(normalized, ['lịch chiếu', 'suất chiếu', 'lịch chiếu hôm nay', 'suất chiếu hôm nay']) ||
      this.match(noAccent, ['lich chieu', 'suat chieu', 'lich chieu hom nay', 'suat chieu hom nay'])
    ) {
      return { intent: ChatIntent.SHOWTIMES };
    }

    // --- NOW_SHOWING ---
    if (
      this.match(normalized, ['phim đang chiếu', 'hôm nay có phim gì', 'đang chiếu', 'phim nào đang', 'danh sách phim', 'có phim gì đang']) ||
      this.match(noAccent, ['phim dang chieu', 'dang chieu', 'phim nao dang', 'danh sach phim', 'co phim'])
    ) {
      return { intent: ChatIntent.NOW_SHOWING };
    }

    // Mặc định là OUT_OF_SCOPE
    return { intent: ChatIntent.OUT_OF_SCOPE };
  }

  /** Chuẩn hóa: lowercase + trim */
  private normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  /** Bỏ dấu tiếng Việt */
  private removeAccents(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  /** Kiểm tra message có chứa bất kỳ keyword nào không */
  private match(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => {
      // Đối với từ khóa rất ngắn (như 'hi'), sử dụng RegExp để khớp đúng nguyên từ, tránh khớp con (như 'phim' chứa 'hi')
      if (kw.length <= 2) {
        const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${kw}($|\\s|[^a-zA-Z0-9])`, 'i');
        return regex.test(text);
      }
      return text.includes(kw);
    });
  }

  /** Cố gắng trích xuất tên phim từ tin nhắn */
  private extractMovieName(text: string): string | undefined {
    const patterns = [
      /phim\s+["'](.+?)[""]/,
      /phim\s+(.+?)\s+(?:có|là|thuộc|dài|nội dung|chi tiết|thời lượng|thể loại|giá|bao nhiêu|còn ghế|lịch chiếu|suất chiếu)/,
      /chi tiết phim\s+(.+?)$/,
      /nội dung phim\s+(.+?)$/,
      /giới thiệu phim\s+(.+?)$/,
      /phim\s+(.+?)$/,
    ];

    let name: string | undefined = undefined;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        name = match[1].trim();
        break;
      }
    }

    if (name) {
      // Loại bỏ các hậu từ tiếng Việt xã giao/yêu cầu phổ biến ở cuối
      const suffixes = [
        /\s+cho\s+tôi$/i,
        /\s+cho\s+mình$/i,
        /\s+cho\s+tớ$/i,
        /\s+giùm\s+tôi$/i,
        /\s+giùm\s+mình$/i,
        /\s+với\s+ạ$/i,
        /\s+với$/i,
        /\s+nhé$/i,
        /\s+nha$/i,
        /\s+ạ$/i,
        /\s+đi$/i,
        /\s+giùm$/i
      ];
      for (const suffix of suffixes) {
        name = name.replace(suffix, '');
      }
      return name.trim();
    }

    return undefined;
  }

  /** Trích xuất tên rạp */
  private extractCinemaName(text: string): string | undefined {
    const patterns = [
      /rạp\s+["'](.+?)[""]/,
      /rạp\s+(.+?)\s+(?:đang|có|ở|chiếu|lịch)/,
      /rạp\s+(.+?)$/,
      /cinema\s+(.+?)$/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /** Trích xuất ngày */
  private extractDate(text: string): string | undefined {
    // Tìm định dạng YYYY-MM-DD
    const ymdMatch = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }

    // Tìm định dạng DD/MM/YYYY hoặc DD-MM-YYYY
    const dmyMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    if (text.includes('hôm nay')) {
      return new Date().toISOString().split('T')[0];
    }

    if (text.includes('ngày mai')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    return undefined;
  }
}

