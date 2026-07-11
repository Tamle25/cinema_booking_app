import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  returnUrl: string;
  ipnUrl: string;
}

// `payWithMethod` là requestType "vạn năng" trong sample chính thức (CollectionLink.js):
// MoMo tự render trang chọn phương thức (Ví/QR + ATM nội địa + Thẻ quốc tế) tùy theo
// phương thức đang được kích hoạt trên merchant. Đây là giá trị mặc định nên dùng.
export type MomoPaymentType =
  | 'payWithMethod'
  | 'captureWallet'
  | 'payWithATM'
  | 'payWithCC';

export interface CreateMomoPaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  paymentType?: MomoPaymentType;
}

export interface MomoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface MomoCallbackParams {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: string;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: string;
  message: string;
  payType: string;
  responseTime: string;
  extraData: string;
  signature: string;
}

export interface MomoQueryResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  extraData: string;
  amount: number;
  transId: number;
  payType: string;
  resultCode: number;
  message: string;
  responseTime: number;
  signature: string;
}

/**
 * Các trường tối thiểu mà MoMo BẮT BUỘC gửi kèm trong mọi callback (IPN/return).
 * Dùng để validate dữ liệu đầu vào trước khi xử lý.
 */
const REQUIRED_CALLBACK_FIELDS: Array<keyof MomoCallbackParams> = [
  'partnerCode',
  'orderId',
  'requestId',
  'amount',
  'resultCode',
  'transId',
  'signature',
];

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  private readonly config: MomoConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      partnerCode: this.configService.get<string>('MOMO_PARTNER_CODE') || '',
      accessKey: this.configService.get<string>('MOMO_ACCESS_KEY') || '',
      secretKey: this.configService.get<string>('MOMO_SECRET_KEY') || '',
      endpoint:
        this.configService.get<string>('MOMO_ENDPOINT') ||
        'https://test-payment.momo.vn/v2/gateway/api/create',
      returnUrl:
        this.configService.get<string>('MOMO_RETURN_URL') ||
        'http://localhost:3000/payment/momo/return',
      ipnUrl:
        this.configService.get<string>('MOMO_IPN_URL') ||
        'http://localhost:4000/payments/momo/ipn',
    };
  }

  generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `MOMO${timestamp}${random}`;
  }

  generateRequestId(): string {
    return `REQ${Date.now()}${Math.floor(Math.random() * 1000000)}`;
  }

  private createSignature(rawData: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawData)
      .digest('hex');
  }

  async createPaymentUrl(
    params: CreateMomoPaymentParams,
  ): Promise<MomoPaymentResponse> {
    const {
      orderId,
      amount,
      orderInfo,
      extraData = '',
      // Mặc định payWithMethod: để MoMo render trang chọn phương thức (đúng sample mới nhất).
      paymentType = 'payWithMethod',
    } = params;

    const requestId = this.generateRequestId();
    const requestType = paymentType;
    const orderGroupId = '';

    const rawSignature =
      `accessKey=${this.config.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${this.config.ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${this.config.partnerCode}` +
      `&redirectUrl=${this.config.returnUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: this.config.partnerCode,
      partnerName: 'Cinema Booking',
      storeId: this.config.partnerCode,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: this.config.returnUrl,
      ipnUrl: this.config.ipnUrl,
      lang: 'vi',
      requestType: requestType,
      autoCapture: true,
      extraData: extraData,
      orderGroupId: orderGroupId,
      signature: signature,
    };

    try {
      this.logger.log(
        `Create MoMo payment orderId=${orderId} requestId=${requestId} requestType=${requestType} redirectUrl=${this.config.returnUrl} ipnUrl=${this.config.ipnUrl}`,
      );

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json()) as MomoPaymentResponse;

      this.logger.log(
        `MoMo create response orderId=${orderId} requestId=${requestId} resultCode=${result.resultCode} message=${result.message}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Lỗi gọi MoMo API', error);
      throw error;
    }
  }

  async queryPaymentStatus(
    orderId: string,
    requestId: string,
  ): Promise<MomoQueryResponse> {
    const rawSignature =
      `accessKey=${this.config.accessKey}` +
      `&orderId=${orderId}` +
      `&partnerCode=${this.config.partnerCode}` +
      `&requestId=${requestId}`;

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: this.config.partnerCode,
      requestId,
      orderId,
      signature,
    };

    const queryEndpoint = this.config.endpoint.replace('/create', '/query');

    try {
      this.logger.log(
        `Query MoMo payment status orderId=${orderId} requestId=${requestId}`,
      );
      const response = await fetch(queryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json()) as MomoQueryResponse;
      this.logger.log(
        `MoMo query response orderId=${orderId} resultCode=${result.resultCode} message=${result.message}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Lỗi gọi MoMo Query API', error);
      throw error;
    }
  }

  verifySignature(params: MomoCallbackParams): boolean {
    // Phòng thủ chống chèn chữ "undefined" hoặc "null" vào chuỗi tính chữ ký khi có trường bị thiếu trong callback
    const partnerCode = params.partnerCode ?? '';
    const orderId = params.orderId ?? '';
    const requestId = params.requestId ?? '';
    const amount = params.amount ?? '';
    const orderInfo = params.orderInfo ?? '';
    const orderType = params.orderType ?? '';
    const transId = params.transId ?? '';
    const resultCode = params.resultCode ?? '';
    const message = params.message ?? '';
    const payType = params.payType ?? '';
    const responseTime = params.responseTime ?? '';
    const extraData = params.extraData ?? '';
    const signature = params.signature ?? '';

    const rawSignature =
      `accessKey=${this.config.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const calculatedSignature = this.createSignature(rawSignature);

    if (!signature) {
      return false;
    }

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'utf8');

    return (
      signatureBuffer.length === calculatedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, calculatedBuffer)
    );
  }

  isPaymentSuccess(resultCode: string | number): boolean {
    return String(resultCode) === '0';
  }

  getResultMessage(resultCode: string | number): {
    success: boolean;
    message: string;
  } {
    const code = String(resultCode);
    const messages: Record<string, { success: boolean; message: string }> = {
      '0': { success: true, message: 'Giao dịch thành công' },
      '9000': {
        success: false,
        message: 'Giao dịch đã được xác nhận thành công',
      },
      '8000': { success: false, message: 'Giao dịch đang được xử lý' },
      '7000': {
        success: false,
        message: 'Giao dịch đang được xử lý bởi nhà cung cấp dịch vụ',
      },
      '1000': { success: false, message: 'Hệ thống đang bảo trì' },
      '1001': { success: false, message: 'Tài khoản không đủ số dư' },
      '1002': {
        success: false,
        message: 'Giao dịch bị từ chối do nhà phát hành thẻ',
      },
      '1003': { success: false, message: 'Giao dịch bị hủy bỏ' },
      '1004': { success: false, message: 'Số tiền giao dịch vượt quá hạn mức' },
      '1005': { success: false, message: 'Url hoặc QR code đã hết hạn' },
      '1006': {
        success: false,
        message: 'Người dùng từ chối xác nhận thanh toán',
      },
      '1007': { success: false, message: 'Không tìm thấy thông tin giao dịch' },
      '1017': { success: false, message: 'Giao dịch bị hủy bởi người dùng' },
      '1026': {
        success: false,
        message: 'Giao dịch bị hạn chế theo quy định của MoMo',
      },
      '1080': { success: false, message: 'Giao dịch hoàn tiền không hợp lệ' },
      '1081': { success: false, message: 'Giao dịch hoàn tiền bị từ chối' },
      '2001': {
        success: false,
        message: 'Giao dịch thất bại do thông tin không hợp lệ',
      },
      '2007': {
        success: false,
        message: 'Giao dịch thất bại do thiếu thông tin bắt buộc',
      },
      '3001': { success: false, message: 'Liên kết thẻ thất bại' },
      '3002': { success: false, message: 'Liên kết thẻ bị hủy bởi người dùng' },
      '3003': { success: false, message: 'Thẻ đã được liên kết' },
      '3004': { success: false, message: 'Thẻ không hợp lệ' },
      '4001': { success: false, message: 'Giao dịch bị hạn chế' },
      '4010': { success: false, message: 'Xác thực thất bại' },
      '4011': { success: false, message: 'OTP không hợp lệ' },
      '4100': { success: false, message: 'Giao dịch thất bại' },
      '49': { success: false, message: 'Người dùng chưa liên kết ví MoMo' },
    };

    return (
      messages[code] || {
        success: false,
        message: `Giao dịch thất bại. Mã lỗi: ${code}`,
      }
    );
  }

  /**
   * Kiểm tra callback có đầy đủ các trường bắt buộc không. Trả về danh sách
   * trường bị thiếu (rỗng nghĩa là hợp lệ về mặt cấu trúc).
   */
  validateCallbackShape(params: Partial<MomoCallbackParams>): string[] {
    return REQUIRED_CALLBACK_FIELDS.filter(
      (field) =>
        params[field] === undefined ||
        params[field] === null ||
        params[field] === '',
    );
  }

  /**
   * Giải mã extraData (base64 JSON) để lấy bookingId. An toàn với dữ liệu lỗi.
   */
  parseExtraData(extraData?: string): { bookingId?: string } {
    if (!extraData) {
      return {};
    }
    try {
      const decoded = Buffer.from(extraData, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded) as { bookingId?: string };
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      this.logger.warn('Không đọc được extraData từ MoMo callback');
      return {};
    }
  }

  /**
   * Mã hoá extraData (bookingId) thành base64 JSON.
   */
  buildExtraData(payload: { bookingId: string }): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  getConfig(): Omit<MomoConfig, 'secretKey' | 'accessKey'> {
    return {
      partnerCode: this.config.partnerCode,
      endpoint: this.config.endpoint,
      returnUrl: this.config.returnUrl,
      ipnUrl: this.config.ipnUrl,
    };
  }
}
