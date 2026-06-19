import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import moment from 'moment';

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  returnUrl: string;
  ipnUrl: string;
}

export interface CreateVnpayParams {
  /** Mã tham chiếu giao dịch (vnp_TxnRef) — duy nhất trong ngày. */
  txnRef: string;
  /** Số tiền (VND, chưa nhân 100). Service sẽ tự nhân 100. */
  amount: number;
  /** Nội dung thanh toán (tiếng Việt KHÔNG dấu, không ký tự đặc biệt). */
  orderInfo: string;
  /** IP khách hàng. */
  ipAddr: string;
  /** Mã ngân hàng tùy chọn (VNPAYQR | VNBANK | INTCARD). */
  bankCode?: string;
  /** Ngôn ngữ giao diện (vn | en). Mặc định vn. */
  locale?: string;
}

/**
 * Toàn bộ tham số vnp_* mà VNPAY trả về ở Return URL và IPN URL.
 * Để dạng record string vì VNPAY gửi qua query string (GET).
 */
export type VnpayCallbackParams = Record<string, string>;

/**
 * Các trường tối thiểu VNPAY luôn gửi kèm trong callback (Return/IPN).
 * Dùng để validate cấu trúc trước khi xử lý.
 */
const REQUIRED_CALLBACK_FIELDS = [
  'vnp_TxnRef',
  'vnp_Amount',
  'vnp_ResponseCode',
  'vnp_TransactionStatus',
  'vnp_SecureHash',
];

/**
 * Tích hợp cổng thanh toán VNPAY (PAY 2.1.0).
 *
 * Trách nhiệm DUY NHẤT: build URL thanh toán + ký/verify checksum (HMAC-SHA512)
 * + map mã lỗi. KHÔNG đụng tới DB/booking (việc đó thuộc VnpaySettlementService).
 *
 * Lưu ý về encode (nguyên nhân #1 gây lỗi checksum 97):
 *  - Chuỗi đem đi KÝ và chuỗi gắn vào URL phải GIỐNG HỆT NHAU về encode.
 *  - Ta encode value MỘT LẦN trong {@link sortObject} (encodeURIComponent + space->'+'),
 *    rồi join thủ công bằng '&'/'=' cho cả lúc ký lẫn lúc build URL.
 */
@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);
  private readonly config: VnpayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      tmnCode: this.configService.get<string>('VNPAY_TMN_CODE') || '',
      hashSecret: this.configService.get<string>('VNPAY_HASH_SECRET') || '',
      vnpUrl:
        this.configService.get<string>('VNPAY_URL') ||
        'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl:
        this.configService.get<string>('VNPAY_RETURN_URL') ||
        'http://localhost:4000/payments/vnpay-return',
      ipnUrl:
        this.configService.get<string>('VNPAY_IPN_URL') ||
        'http://localhost:4000/payments/vnpay-ipn',
    };
  }

  /**
   * Sắp xếp tham số theo tên (tăng dần) và encode value MỘT LẦN.
   * Space -> '+' để khớp đúng cách application/x-www-form-urlencoded của VNPAY.
   */
  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
    return sorted;
  }

  /** Nối các cặp key=value (value đã encode sẵn) thành query string. */
  private buildQueryString(sorted: Record<string, string>): string {
    return Object.keys(sorted)
      .map((key) => `${key}=${sorted[key]}`)
      .join('&');
  }

  private signSha512(data: string): string {
    return crypto
      .createHmac('sha512', this.config.hashSecret)
      .update(Buffer.from(data, 'utf-8'))
      .digest('hex');
  }

  /**
   * Build URL chuyển hướng sang cổng VNPAY (vnp_Command=pay).
   */
  buildPaymentUrl(params: CreateVnpayParams): string {
    const createDate = moment().format('YYYYMMDDHHmmss');
    const expireDate = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.txnRef,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(params.amount * 100),
      vnp_ReturnUrl: this.config.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (params.bankCode) {
      vnpParams.vnp_BankCode = params.bankCode;
    }

    const sorted = this.sortObject(vnpParams);
    const signData = this.buildQueryString(sorted);
    const secureHash = this.signSha512(signData);

    this.logger.log(
      `Build VNPAY URL txnRef=${params.txnRef} amount=${params.amount} createDate=${createDate}`,
    );

    return `${this.config.vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  /**
   * Xác thực chữ ký callback (Return/IPN). Loại bỏ vnp_SecureHash &
   * vnp_SecureHashType, sort + encode lại phần còn lại rồi so SHA512.
   */
  verifySignature(params: VnpayCallbackParams): boolean {
    const received = params.vnp_SecureHash;
    if (!received) {
      return false;
    }

    const rest: Record<string, string> = {};
    for (const key of Object.keys(params)) {
      if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') {
        continue;
      }
      rest[key] = params[key];
    }

    const sorted = this.sortObject(rest);
    const signData = this.buildQueryString(sorted);
    const calculated = this.signSha512(signData);

    const receivedBuffer = Buffer.from(received.toLowerCase(), 'utf8');
    const calculatedBuffer = Buffer.from(calculated.toLowerCase(), 'utf8');

    return (
      receivedBuffer.length === calculatedBuffer.length &&
      crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)
    );
  }

  /**
   * Giao dịch thành công khi CẢ vnp_ResponseCode VÀ vnp_TransactionStatus = '00'.
   */
  isPaymentSuccess(params: VnpayCallbackParams): boolean {
    return (
      params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00'
    );
  }

  /** Kiểm tra callback có đủ các trường bắt buộc không. Trả về danh sách thiếu. */
  validateCallbackShape(params: VnpayCallbackParams): string[] {
    return REQUIRED_CALLBACK_FIELDS.filter(
      (field) =>
        params[field] === undefined ||
        params[field] === null ||
        params[field] === '',
    );
  }

  /** Map vnp_ResponseCode -> thông điệp tiếng Việt (theo bảng mã lỗi VNPAY). */
  getResultMessage(responseCode: string): { success: boolean; message: string } {
    const messages: Record<string, { success: boolean; message: string }> = {
      '00': { success: true, message: 'Giao dịch thành công' },
      '07': {
        success: false,
        message:
          'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới gian lận/giao dịch bất thường).',
      },
      '09': {
        success: false,
        message:
          'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      },
      '10': {
        success: false,
        message: 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
      },
      '11': {
        success: false,
        message: 'Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.',
      },
      '12': {
        success: false,
        message: 'Thẻ/Tài khoản bị khóa.',
      },
      '13': {
        success: false,
        message:
          'Nhập sai mật khẩu xác thực giao dịch (OTP). Vui lòng thực hiện lại.',
      },
      '24': {
        success: false,
        message: 'Khách hàng hủy giao dịch.',
      },
      '51': {
        success: false,
        message: 'Tài khoản không đủ số dư để thực hiện giao dịch.',
      },
      '65': {
        success: false,
        message: 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
      },
      '75': {
        success: false,
        message: 'Ngân hàng thanh toán đang bảo trì.',
      },
      '79': {
        success: false,
        message:
          'Nhập sai mật khẩu thanh toán quá số lần quy định. Vui lòng thực hiện lại.',
      },
      '99': {
        success: false,
        message: 'Giao dịch không thành công (lỗi khác).',
      },
    };

    return (
      messages[responseCode] || {
        success: false,
        message: `Giao dịch không thành công. Mã lỗi: ${responseCode}`,
      }
    );
  }

  getConfig(): Omit<VnpayConfig, 'hashSecret'> {
    return {
      tmnCode: this.config.tmnCode,
      vnpUrl: this.config.vnpUrl,
      returnUrl: this.config.returnUrl,
      ipnUrl: this.config.ipnUrl,
    };
  }
}
