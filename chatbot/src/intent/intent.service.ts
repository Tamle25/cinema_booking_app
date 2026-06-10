import { Injectable } from '@nestjs/common';
import { ChatIntent, IntentResult } from '../chatbot/types/chatbot.types';

@Injectable()
export class IntentService {
  classify(message: string): IntentResult {
    const normalized = this.normalize(message);
    const noAccent = this.removeAccents(normalized);

    const movieName = this.extractMovieName(normalized);
    const cinemaName = this.extractCinemaName(normalized);
    const date = this.extractDate(normalized);

    const genres = ['hành động', 'kinh dị', 'hoạt hình', 'tình cảm', 'hài', 'viễn tưởng', 'tài liệu', 'phiêu lưu', 'tâm lý', 'gia đình', 'anime', 'drama'];
    const noAccentGenres = ['hanh dong', 'kinh di', 'hoat hinh', 'tinh cam', 'hai', 'vien tuong', 'tai lieu', 'phieu luu', 'tam ly', 'gia dinh', 'anime', 'drama'];
    
    let genre: string | undefined = undefined;
    for (let i = 0; i < genres.length; i++) {
      if (normalized.includes(genres[i]) || noAccent.includes(noAccentGenres[i])) {
        genre = genres[i];
        break;
      }
    }

    let intent = ChatIntent.OUT_OF_SCOPE;

    // ============================================================
    // GREETING
    // ============================================================
    if (
      this.match(normalized, ['xin chào', 'chào bạn', 'hello', 'hi', 'bạn là ai', 'chatbot là ai', 'chào bot', 'bot ơi', 'chào']) ||
      this.match(noAccent, ['xin chao', 'chao ban', 'ban la ai', 'chatbot la ai', 'chao bot', 'bot oi', 'chao'])
    ) {
      intent = ChatIntent.GREETING;
    }

    // ============================================================
    // SMALL_TALK
    // ============================================================
    else if (
      this.match(normalized, ['cảm ơn', 'cám ơn', 'thank', 'thanks', 'ok', 'okay', 'được rồi', 'tạm biệt', 'bye', 'tuyệt', 'tốt', 'hay quá', 'hiểu rồi', 'rồi', 'oke', 'ừ', 'ừm', 'uhm']) ||
      this.match(noAccent, ['cam on', 'cam on', 'duoc roi', 'tam biet', 'tuyet', 'tot', 'hay qua', 'hieu roi'])
    ) {
      intent = ChatIntent.SMALL_TALK;
    }

    // ============================================================
    // FAQ_POLICY
    // ============================================================
    else if (
      this.match(normalized, ['hoàn vé', 'hoan ve', 'đổi vé', 'doi ve', 'hủy vé', 'huy ve', 'chính sách', 'chinh sach', 'điều khoản', 'dieu khoan', 'quy định', 'quy dinh', 'quy chế', 'làm sao để hoàn', 'hướng dẫn hoàn', 'trả vé', 'tra ve', 'hoàn tiền', 'hoan tien', 'hoàn lại', 'hoan lai', 'thanh toán thế nào', 'thanh toan the nao', 'thanh toan ra sao']) ||
      this.match(noAccent, ['hoan ve', 'doi ve', 'huy ve', 'chinh sach', 'dieu khoan', 'quy dinh', 'tra ve', 'hoan tien'])
    ) {
      intent = ChatIntent.FAQ_POLICY;
    }

    // ============================================================
    // COMBO_QUERY
    // ============================================================
    else if (
      this.match(normalized, ['combo', 'bắp nước', 'bắp rang', 'popcorn', 'nước uống', 'đồ ăn kèm', 'thức ăn', 'bắp rang bơ', 'bap nuoc', 'bap rang', 'nuoc uong', 'do an kem']) ||
      this.match(noAccent, ['combo', 'bap nuoc', 'bap rang', 'popcorn', 'nuoc uong', 'do an kem', 'thuc an', 'bap rang bo'])
    ) {
      intent = ChatIntent.COMBO_QUERY;
    }

    // ============================================================
    // VOUCHER_QUERY
    // ============================================================
    else if (
      this.match(normalized, ['voucher', 'mã giảm giá', 'ma giam gia', 'đổi điểm', 'doi diem', 'tích lũy', 'tich luy', 'coupon', 'mã ưu đãi', 'ma uu dai', 'đổi voucher', 'doi voucher']) ||
      this.match(noAccent, ['voucher', 'ma giam gia', 'doi diem', 'tich luy', 'coupon', 'ma uu dai', 'doi voucher'])
    ) {
      intent = ChatIntent.VOUCHER_QUERY;
    }

    // ============================================================
    // PROMOTION (khuyến mãi chung)
    // ============================================================
    else if (
      this.match(normalized, ['khuyến mãi', 'khuyen mai', 'giảm giá', 'giam gia', 'ưu đãi', 'uu dai', 'chương trình', 'chuong trinh']) ||
      this.match(noAccent, ['khuyen mai', 'giam gia', 'uu dai', 'chuong trinh'])
    ) {
      intent = ChatIntent.PROMOTION;
    }

    // ============================================================
    // BOOKING_STATUS
    // ============================================================
    else if (
      this.match(normalized, ['vé của tôi', 'vé đã đặt', 'lịch sử đặt vé', 'booking của tôi', 'vé đã mua', 'xem vé', 'tra cứu vé', 'trạng thái đặt', 'trạng thái đơn', 'lịch sử mua', 'my ticket', 'vé tôi', 'vé đã thanh toán', 've da dat', 've cua toi']) ||
      this.match(noAccent, ['ve cua toi', 've da dat', 'lich su dat ve', 'booking cua toi', 've da mua', 'xem ve', 'tra cuu ve', 'trang thai dat', 'trang thai don', 've toi'])
    ) {
      intent = ChatIntent.BOOKING_STATUS;
    }

    // ============================================================
    // SEAT_STATUS
    // ============================================================
    else if (
      this.match(normalized, ['ghế trống', 'ghe trong', 'còn ghế', 'con ghe', 'chỗ ngồi', 'cho ngoi', 'ghế đôi', 'ghe doi', 'còn chỗ', 'con cho', 'sơ đồ ghế', 'so do ghe', 'chọn ghế', 'chon ghe', 'vị trí ngồi', 'ghế vip', 'ghe vip']) ||
      this.match(noAccent, ['ghe trong', 'con ghe', 'cho ngoi', 'ghe doi', 'con cho', 'so do ghe', 'chon ghe'])
    ) {
      intent = ChatIntent.SEAT_STATUS;
    }

    // ============================================================
    // TICKET_PRICE
    // ============================================================
    else if (
      this.match(normalized, ['giá vé', 'gia ve', 'bao nhiêu tiền', 'bao nhieu tien', 'vé bao nhiêu', 've bao nhieu', 'giá tiền vé', 'gia tien ve', 'tiền vé', 'tien ve', 'giá cả', 'gia ca', 'bảng giá', 'bang gia', 'bao nhiêu 1 vé', 'gia ve xem phim', 'giá vé phim']) ||
      this.match(noAccent, ['gia ve', 'bao nhieu tien', 've bao nhieu', 'gia tien ve', 'tien ve', 'gia ca', 'bang gia'])
    ) {
      intent = ChatIntent.TICKET_PRICE;
    }

    // ============================================================
    // BOOKING_GUIDE
    // ============================================================
    else if (
      this.match(normalized, ['đặt vé', 'dat ve', 'mua vé', 'mua ve', 'book vé', 'book ve', 'muốn đặt vé', 'muon dat ve', 'muốn mua vé', 'muon mua ve', 'đặt vé xem phim', 'dat ve xem phim', 'hướng dẫn đặt', 'huong dan dat', 'cách đặt', 'cach dat', 'đặt phim']) ||
      this.match(noAccent, ['dat ve', 'mua ve', 'book ve', 'muon dat ve', 'muon mua ve', 'dat ve xem phim', 'huong dan dat', 'cach dat'])
    ) {
      intent = ChatIntent.BOOKING_GUIDE;
    }

    // ============================================================
    // MOVIE_DETAIL
    // ============================================================
    else if (
      this.match(normalized, ['tóm tắt', 'tom tat', 'nội dung', 'noi dung', 'trailer', 'cốt truyện', 'cot truyen', 'review', 'giới thiệu phim', 'gioi thieu phim', 'phim này nói về', 'phim nay noi ve', 'trailer phim', 'nói về cái gì', 'phim đó có gì', 'xem chi tiết', 'xem chi tiet', 'thông tin của phim', 'thông tin chi tiết', 'thong tin chi tiet', 'hay không', 'hay ko', 'có hay', 'co hay']) ||
      this.match(noAccent, ['tom tat', 'noi dung', 'trailer', 'cot truyen', 'review', 'xem chi tiet'])
    ) {
      intent = ChatIntent.MOVIE_DETAIL;
    }

    // ============================================================
    // MOVIE_BY_GENRE
    // ============================================================
    else if (genre) {
      intent = ChatIntent.MOVIE_BY_GENRE;
    }

    // ============================================================
    // UPCOMING_MOVIES
    // ============================================================
    else if (
      this.match(normalized, ['phim sắp chiếu', 'sắp ra mắt', 'coming soon', 'phim sắp ra', 'phim mới sắp', 'sắp chiếu', 'sap chieu', 'sap ra mat']) ||
      this.match(noAccent, ['phim sap chieu', 'sap ra mat', 'phim sap ra', 'phim moi sap', 'sap chieu'])
    ) {
      intent = ChatIntent.UPCOMING_MOVIES;
    }

    // ============================================================
    // TODAY_MOVIES / NOW_SHOWING
    // ============================================================
    else if (
      this.match(normalized, ['hôm nay có phim gì', 'hom nay co phim gi', 'hôm nay chiếu phim gì', 'hom nay chieu phim gi', 'phim hôm nay', 'phim hom nay', 'tối nay có phim gì', 'toi nay co phim gi', 'xem phim tối nay', 'xem phim hôm nay', 'cho tôi xem danh sách phim hôm nay', 'danh sách phim hôm nay']) ||
      this.match(noAccent, ['hom nay co phim gi', 'hom nay chieu phim gi', 'phim hom nay', 'toi nay co phim gi', 'xem phim toi nay', 'xem phim hom nay'])
    ) {
      intent = ChatIntent.TODAY_MOVIES;
    }
    else if (
      this.match(normalized, ['phim đang chiếu', 'đang chiếu', 'dang chieu', 'phim nào đang', 'phim dang chieu', 'danh sách phim', 'danh sach phim', 'phim hot', 'có phim nào đang chiếu', 'co phim nao dang chieu']) ||
      this.match(noAccent, ['phim dang chieu', 'dang chieu', 'phim nao dang', 'danh sach phim', 'phim hot', 'co phim nao dang chieu'])
    ) {
      intent = ChatIntent.NOW_SHOWING;
    }

    // ============================================================
    // CINEMA_QUERY
    // ============================================================
    else if (
      this.match(normalized, ['rạp nào', 'rap nao', 'ở rạp nào', 'o rap nao', 'rạp chiếu', 'rap chieu', 'hệ thống rạp', 'he thong rap', 'địa chỉ rạp', 'dia chi rap', 'cinema nào', 'rạp có', 'rap co', 'rạp gần', 'rap gan', 'rạp gần tôi', 'rap gan toi']) ||
      this.match(noAccent, ['rap nao', 'o rap nao', 'rap chieu', 'he thong rap', 'dia chi rap', 'rap co', 'rap gan', 'rap gan toi'])
    ) {
      intent = ChatIntent.CINEMA_QUERY;
    }

    // ============================================================
    // SHOWTIMES
    // ============================================================
    else if (
      this.match(normalized, ['lịch chiếu', 'lich chieu', 'suất chiếu', 'suat chieu', 'giờ chiếu', 'gio chieu', 'suất tối nay', 'suat toi nay', 'suất chiếu hôm nay', 'lịch hôm nay', 'còn suất nào', 'con suat nao', 'chiếu mấy giờ', 'chieu may gio', 'còn suất', 'con suat']) ||
      this.match(noAccent, ['lich chieu', 'suat chieu', 'gio chieu', 'suat toi nay', 'suat chieu hom nay', 'con suat nao', 'chieu may gio', 'con suat'])
    ) {
      intent = ChatIntent.SHOWTIMES;
    }

    // ============================================================
    // NAVIGATION_REQUEST
    // ============================================================
    else if (
      this.match(normalized, ['thành viên', 'thanh vien', 'trang cá nhân', 'trang ca nhan', 'profile', 'đăng ký', 'dang ky', 'đăng nhập', 'dang nhap', 'checkout', 'tin tức', 'tin tuc', 'thanh toán', 'thanh toan', 'ví của tôi', 'vi cua toi']) ||
      this.match(noAccent, ['thanh vien', 'trang ca nhan', 'profile', 'dang ky', 'dang nhap', 'checkout', 'tin tuc', 'thanh toan'])
    ) {
      intent = ChatIntent.NAVIGATION_REQUEST;
    }

    return {
      intent,
      movieName,
      cinemaName,
      date,
      genre,
      extractedKeyword: movieName || cinemaName || genre || normalized
    };
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  private removeAccents(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private match(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => {
      if (kw.length <= 2) {
        const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${kw}($|\\s|[^a-zA-Z0-9])`, 'i');
        return regex.test(text);
      }
      return text.includes(kw);
    });
  }

  private extractMovieName(text: string): string | undefined {
    const patterns = [
      /phim\s+["'](.+?)["\"]/,
      /phim\s+(.+?)\s+(?:có|là|thuộc|dài|nội dung|chi tiết|thời lượng|thể loại|giá|bao nhiêu|còn ghế|lịch chiếu|suất chiếu)/,
      /chi tiết phim\s+(.+?)$/,
      /nội dung phim\s+(.+?)$/,
      /giới thiệu phim\s+(.+?)$/,
      /thông tin phim\s+(.+?)$/,
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
      const suffixes = [
        /\s+cho\s+tôi$/i,
        /\s+cho\s+mình$/i,
        /\s+cho\s+tớ$/i,
        /\s+giùm\s+tôi$/i,
        /\s+giùm\s+mình$/i,
        /\s+với\s+ạ$/i,
        /\s+với$/i,
        /\s+nhá$/i,
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

  private extractCinemaName(text: string): string | undefined {
    const patterns = [
      /rạp\s+["'](.+?)["\"]/,
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

  private extractDate(text: string): string | undefined {
    const ymdMatch = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }

    const dmyMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    if (text.includes('hôm nay') || text.includes('hom nay')) {
      return new Date().toISOString().split('T')[0];
    }

    if (text.includes('ngày mai') || text.includes('ngay mai')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    if (text.includes('tối nay') || text.includes('toi nay')) {
      return new Date().toISOString().split('T')[0];
    }

    return undefined;
  }
}
