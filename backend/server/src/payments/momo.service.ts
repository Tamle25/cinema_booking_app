import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * MoMo Payment Service
 * Theo tài liệu chính thức MoMo Payment Gateway
 * https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime
 */

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  returnUrl: string;
  ipnUrl: string;
}

// Các phương thức thanh toán MoMo hỗ trợ
export type MomoPaymentType = 'captureWallet' | 'payWithATM' | 'payWithCC';

export interface CreateMomoPaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  paymentType?: MomoPaymentType; // Thêm option chọn phương thức
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

@Injectable()
export class MomoService {
  private readonly config: MomoConfig;

  constructor(private configService: ConfigService) {
    // Đọc config từ ConfigService (đảm bảo đã load từ .env)
    this.config = {
      partnerCode: this.configService.get<string>('MOMO_PARTNER_CODE') || '',
      accessKey: this.configService.get<string>('MOMO_ACCESS_KEY') || '',
      secretKey: this.configService.get<string>('MOMO_SECRET_KEY') || '',
      endpoint: this.configService.get<string>('MOMO_ENDPOINT') || 'https://test-payment.momo.vn/v2/gateway/api/create',
      returnUrl: this.configService.get<string>('MOMO_RETURN_URL') || 'http://localhost:3000/payment/momo-return',
      ipnUrl: this.configService.get<string>('MOMO_IPN_URL') || 'http://localhost:4000/payments/momo-ipn',
    };

    console.log('=== MoMo Config Loaded ===');
    console.log('PartnerCode:', this.config.partnerCode);
    console.log('AccessKey:', this.config.accessKey ? this.config.accessKey.substring(0, 8) + '...' : 'NOT SET');
    console.log('SecretKey:', this.config.secretKey ? this.config.secretKey.substring(0, 8) + '...' : 'NOT SET');
    console.log('Endpoint:', this.config.endpoint);
    console.log('ReturnUrl:', this.config.returnUrl);
    console.log('IpnUrl:', this.config.ipnUrl);
    console.log('==========================');
  }

  /**
   * Tạo mã giao dịch unique
   * Format: MOMO + timestamp + random
   */
  generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `MOMO${timestamp}${random}`;
  }

  /**
   * Tạo requestId unique
   */
  generateRequestId(): string {
    return `REQ${Date.now()}${Math.floor(Math.random() * 1000000)}`;
  }

  /**
   * Tạo chữ ký HMAC SHA256 theo tài liệu MoMo
   * rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + 
   *                "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + 
   *                "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + 
   *                "&requestId=" + requestId + "&requestType=" + requestType
   */
  private createSignature(rawData: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawData)
      .digest('hex');
  }

  /**
   * Tạo URL thanh toán MoMo
   * Hỗ trợ các phương thức: captureWallet (QR), payWithATM (thẻ ATM), payWithCC (thẻ quốc tế)
   */
  async createPaymentUrl(params: CreateMomoPaymentParams): Promise<MomoPaymentResponse> {
    const { orderId, amount, orderInfo, extraData = '', paymentType = 'captureWallet' } = params;

    const requestId = this.generateRequestId();
    const requestType = paymentType; // Sử dụng phương thức thanh toán từ params

    // Tạo rawSignature theo thứ tự alphabet (theo tài liệu MoMo)
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

    console.log('=== MOMO CREATE SIGNATURE ===');
    console.log('RawSignature:', rawSignature);

    const signature = this.createSignature(rawSignature);
    console.log('Signature:', signature);

    // Tạo request body theo tài liệu MoMo API v2
    // Lưu ý: KHÔNG gửi accessKey trong request body
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
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      autoCapture: true, // Tự động capture tiền
    };

    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    try {
      // Gọi API MoMo
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json() as MomoPaymentResponse;

      console.log('=== MOMO API RESPONSE ===');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('=========================');

      return result;
    } catch (error) {
      console.error('MoMo API Error:', error);
      throw error;
    }
  }

  /**
   * Xác thực chữ ký callback từ MoMo (IPN / Return URL)
   * rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData +
   *                "&message=" + message + "&orderId=" + orderId + "&orderInfo=" + orderInfo +
   *                "&orderType=" + orderType + "&partnerCode=" + partnerCode + "&payType=" + payType +
   *                "&requestId=" + requestId + "&responseTime=" + responseTime +
   *                "&resultCode=" + resultCode + "&transId=" + transId
   */
  verifySignature(params: MomoCallbackParams): boolean {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = params;

    // Tạo rawSignature theo thứ tự alphabet (theo tài liệu MoMo)
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

    console.log('=== MOMO VERIFY SIGNATURE ===');
    console.log('RawSignature:', rawSignature);

    const calculatedSignature = this.createSignature(rawSignature);
    console.log('Received Signature:', signature);
    console.log('Calculated Signature:', calculatedSignature);
    console.log('Match:', signature === calculatedSignature);
    console.log('=============================');

    return signature === calculatedSignature;
  }

  /**
   * Kiểm tra kết quả thanh toán từ MoMo
   * resultCode = 0: Thành công
   * resultCode != 0: Thất bại
   */
  isPaymentSuccess(resultCode: string | number): boolean {
    return String(resultCode) === '0';
  }

  /**
   * Lấy message theo resultCode từ MoMo
   * Theo tài liệu MoMo Payment Gateway
   */
  getResultMessage(resultCode: string | number): { success: boolean; message: string } {
    const code = String(resultCode);
    const messages: Record<string, { success: boolean; message: string }> = {
      '0': { success: true, message: 'Giao dịch thành công' },
      '9000': { success: false, message: 'Giao dịch đã được xác nhận thành công' },
      '8000': { success: false, message: 'Giao dịch đang được xử lý' },
      '7000': { success: false, message: 'Giao dịch đang được xử lý bởi nhà cung cấp dịch vụ' },
      '1000': { success: false, message: 'Hệ thống đang bảo trì' },
      '1001': { success: false, message: 'Tài khoản không đủ số dư' },
      '1002': { success: false, message: 'Giao dịch bị từ chối do nhà phát hành thẻ' },
      '1003': { success: false, message: 'Giao dịch bị hủy bỏ' },
      '1004': { success: false, message: 'Số tiền giao dịch vượt quá hạn mức' },
      '1005': { success: false, message: 'Url hoặc QR code đã hết hạn' },
      '1006': { success: false, message: 'Người dùng từ chối xác nhận thanh toán' },
      '1007': { success: false, message: 'Không tìm thấy thông tin giao dịch' },
      '1017': { success: false, message: 'Giao dịch bị hủy bởi người dùng' },
      '1026': { success: false, message: 'Giao dịch bị hạn chế theo quy định của MoMo' },
      '1080': { success: false, message: 'Giao dịch hoàn tiền không hợp lệ' },
      '1081': { success: false, message: 'Giao dịch hoàn tiền bị từ chối' },
      '2001': { success: false, message: 'Giao dịch thất bại do thông tin không hợp lệ' },
      '2007': { success: false, message: 'Giao dịch thất bại do thiếu thông tin bắt buộc' },
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

    return messages[code] || { success: false, message: `Giao dịch thất bại. Mã lỗi: ${code}` };
  }

  /**
   * Lấy cấu hình (để debug)
   */
  getConfig(): Omit<MomoConfig, 'secretKey' | 'accessKey'> {
    return {
      partnerCode: this.config.partnerCode,
      endpoint: this.config.endpoint,
      returnUrl: this.config.returnUrl,
      ipnUrl: this.config.ipnUrl,
    };
  }
}
