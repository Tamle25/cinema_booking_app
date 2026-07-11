import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VnpayService, VnpayCallbackParams } from './vnpay.service';
import { SeatReservationService } from './seat-reservation.service';
import { Booking } from '../bookings/schemas/booking.schema';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { VouchersService } from '../vouchers/vouchers.service';

/**
 * Kết quả chuẩn hoá sau khi đối soát một callback VNPAY với đơn hàng.
 * Dùng chung cho cả luồng redirect (return) và IPN.
 */
export type VnpaySettlementStatus =
  | 'confirmed'
  | 'already_confirmed'
  | 'failed'
  | 'already_failed'
  | 'pending'
  | 'invalid_signature'
  | 'not_found'
  | 'order_mismatch'
  | 'amount_mismatch'
  | 'invalid_shape';

export interface VnpaySettlementResult {
  status: VnpaySettlementStatus;
  booking?: Booking & { _id: any };
  message: string;
  transId?: string;
}

/** Kết quả trả về cho frontend ở luồng redirect. */
export interface VnpayPaymentResult {
  success: boolean;
  message: string;
  bookingId?: string;
  transactionId?: string;
  status?: string;
}

const FINAL_FAILED_STATUSES = ['failed', 'expired', 'cancelled'];

/**
 * Chịu trách nhiệm DUY NHẤT cho việc đối soát callback thanh toán VNPAY và cập
 * nhật trạng thái đơn hàng một cách idempotent.
 *
 * Cả IPN (server-to-server) lẫn redirect (browser) đều đi qua {@link settle}
 * nên logic xác thực + cập nhật chỉ tồn tại một nơi. Việc cập nhật dùng update
 * có điều kiện (`status: 'pending'`) để đảm bảo dù IPN và redirect chạy đồng
 * thời thì đơn hàng cũng chỉ được xác nhận/đánh-trượt đúng một lần.
 *
 * Theo tài liệu VNPAY: Return URL chỉ nên hiển thị kết quả, còn IPN mới là
 * nguồn cập nhật chính. Tuy nhiên để dev trên localhost hoạt động được (IPN
 * không gọi tới được localhost:4000), luồng return cũng tự settle giống MoMo.
 */
@Injectable()
export class VnpaySettlementService {
  private readonly logger = new Logger(VnpaySettlementService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    private readonly vnpayService: VnpayService,
    private readonly seatReservation: SeatReservationService,
    private readonly loyaltyService: LoyaltyService,
    private readonly vouchersService: VouchersService,
  ) {}

  /**
   * Đối soát một callback VNPAY với đơn hàng và cập nhật trạng thái nếu cần.
   * Là nguồn chân lý duy nhất, an toàn để gọi lại nhiều lần.
   */
  async settle(
    params: VnpayCallbackParams,
    source: 'ipn' | 'return',
  ): Promise<VnpaySettlementResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[VnpaySettlement ${ts()}] [SETTLE_START] source=${source} txnRef=${params.vnp_TxnRef} responseCode=${params.vnp_ResponseCode} status=${params.vnp_TransactionStatus}`,
    );

    const missing = this.vnpayService.validateCallbackShape(params);
    if (missing.length > 0) {
      this.logger.warn(
        `[VnpaySettlement ${ts()}] [SETTLE_INVALID_SHAPE] Thiếu trường: ${missing.join(', ')}`,
      );
      return {
        status: 'invalid_shape',
        message: 'Dữ liệu callback không hợp lệ',
      };
    }

    const txnRef = params.vnp_TxnRef;
    const amount = Number(params.vnp_Amount) / 100; // VNPAY gửi đã nhân 100

    const booking = await this.findBooking(txnRef);
    if (!booking) {
      this.logger.warn(
        `[VnpaySettlement ${ts()}] [SETTLE_NOT_FOUND] Không tìm thấy booking txnRef=${txnRef}`,
      );
      return { status: 'not_found', message: 'Không tìm thấy đơn đặt vé' };
    }

    // Đã ở trạng thái cuối => idempotent, không xử lý lại.
    if (booking.status === 'confirmed') {
      return {
        status: 'already_confirmed',
        booking,
        transId: booking.vnpay_trans_no,
        message: 'Thanh toán thành công! Vé đã được xác nhận.',
      };
    }
    if (FINAL_FAILED_STATUSES.includes(booking.status)) {
      return {
        status: 'already_failed',
        booking,
        message: booking.payment_note || 'Giao dịch không thành công',
      };
    }

    // Xác thực chữ ký (cả IPN lẫn return đều là callback inbound nên đều phải verify).
    if (!this.vnpayService.verifySignature(params)) {
      this.logger.warn(
        `[VnpaySettlement ${ts()}] [SETTLE_INVALID_SIGNATURE] Sai chữ ký txnRef=${txnRef}`,
      );
      return {
        status: 'invalid_signature',
        message: 'Chữ ký không hợp lệ! Giao dịch có thể bị giả mạo.',
      };
    }

    // Đối chiếu mã giao dịch.
    if (booking.vnpay_txn_ref !== txnRef) {
      this.logger.warn(
        `[VnpaySettlement ${ts()}] [SETTLE_ORDER_MISMATCH] booking.vnpay_txn_ref=${booking.vnpay_txn_ref} !== txnRef=${txnRef}`,
      );
      return {
        status: 'order_mismatch',
        booking,
        message: 'Mã đơn hàng không khớp',
      };
    }

    if (booking.total_price !== amount) {
      this.logger.warn(
        `[VnpaySettlement ${ts()}] [SETTLE_AMOUNT_MISMATCH] expected=${booking.total_price} got=${amount}`,
      );
      return {
        status: 'amount_mismatch',
        booking,
        message: 'Số tiền thanh toán không khớp với đơn hàng',
      };
    }

    const isSuccess = this.vnpayService.isPaymentSuccess(params);
    const { message: resultMessage } = this.vnpayService.getResultMessage(
      params.vnp_ResponseCode,
    );

    this.logger.log(
      `[VnpaySettlement ${ts()}] [SETTLE_DECISION] booking=${booking._id} isSuccess=${isSuccess} responseCode=${params.vnp_ResponseCode}`,
    );

    return isSuccess
      ? this.confirmBooking(booking, params, resultMessage)
      : this.failBooking(booking, params, resultMessage);
  }

  /**
   * Xử lý redirect (browser quay về sau khi thanh toán). Tự settle để đơn hàng
   * luôn được cập nhật ngay cả khi IPN (cần URL public) chưa/không tới được.
   */
  async handleReturn(params: VnpayCallbackParams): Promise<VnpayPaymentResult> {
    const result = await this.settle(params, 'return');
    const booking = result.booking;
    const success =
      result.status === 'confirmed' || result.status === 'already_confirmed';

    return {
      success,
      message: result.message,
      bookingId: booking?._id?.toString(),
      transactionId: result.transId || booking?.vnpay_trans_no,
      status: booking?.status,
    };
  }

  /**
   * Xử lý IPN (server-to-server). Trả về đúng định dạng VNPAY yêu cầu
   * `{ RspCode, Message }`. Quy ước mã để VNPAY biết kết thúc hay retry:
   *  - 00: đã cập nhật thành công (kể cả giao dịch thất bại đã được ghi nhận)
   *  - 02: đơn đã được cập nhật trạng thái trước đó (idempotent)
   *  - 01: không tìm thấy đơn hàng
   *  - 04: số tiền không hợp lệ
   *  - 97: sai checksum
   *  - 99: lỗi/dữ liệu không hợp lệ khác
   */
  async handleIpn(
    params: VnpayCallbackParams,
  ): Promise<{ RspCode: string; Message: string }> {
    const ts = () => new Date().toISOString();
    try {
      const result = await this.settle(params, 'ipn');

      switch (result.status) {
        case 'confirmed':
        case 'failed':
          return { RspCode: '00', Message: 'Confirm Success' };
        case 'already_confirmed':
        case 'already_failed':
        case 'pending':
          return {
            RspCode: '02',
            Message: 'Order already confirmed',
          };
        case 'amount_mismatch':
          return { RspCode: '04', Message: 'Invalid amount' };
        case 'invalid_signature':
          return { RspCode: '97', Message: 'Invalid checksum' };
        case 'not_found':
        case 'order_mismatch':
          return { RspCode: '01', Message: 'Order not found' };
        case 'invalid_shape':
        default:
          return { RspCode: '99', Message: 'Invalid data' };
      }
    } catch (error) {
      this.logger.error(`[VnpaySettlement ${ts()}] [HANDLE_IPN_ERROR]`, error);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  /** Xác nhận đơn hàng (pending -> confirmed) một cách nguyên tử. */
  private async confirmBooking(
    booking: Booking & { _id: any },
    params: VnpayCallbackParams,
    resultMessage: string,
  ): Promise<VnpaySettlementResult> {
    const ts = () => new Date().toISOString();
    const updated = await this.bookingModel.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      {
        status: 'confirmed',
        vnpay_trans_no: params.vnp_TransactionNo,
        vnpay_bank_code: params.vnp_BankCode,
        vnpay_response_code: params.vnp_ResponseCode,
        payment_note: resultMessage,
      },
      { new: true },
    );

    // Update không khớp => một tiến trình khác (IPN/return) đã xử lý trước.
    if (!updated) {
      const fresh = await this.bookingModel.findById(booking._id);
      const confirmed = fresh?.status === 'confirmed';
      return {
        status: confirmed ? 'already_confirmed' : 'pending',
        booking: fresh ?? booking,
        transId: fresh?.vnpay_trans_no,
        message: confirmed
          ? 'Thanh toán thành công! Vé đã được xác nhận.'
          : 'Đang xác minh thanh toán.',
      };
    }

    // Chỉ chạy hiệu ứng phụ ĐÚNG MỘT LẦN, ngay sau khi giành được transition.
    await this.runPostPaymentSideEffects(updated);

    const showtimeId =
      typeof updated.showtime === 'object' &&
      updated.showtime !== null &&
      '_id' in updated.showtime
        ? (updated.showtime as any)._id.toString()
        : updated.showtime.toString();
    await this.seatReservation.markSeatsBooked(showtimeId, updated.seats);

    this.logger.log(
      `[VnpaySettlement ${ts()}] [CONFIRM_SUCCESS] Đơn ${updated._id} đã xác nhận thanh toán VNPAY`,
    );
    return {
      status: 'confirmed',
      booking: updated,
      transId: params.vnp_TransactionNo,
      message: 'Thanh toán thành công! Vé đã được xác nhận.',
    };
  }

  /** Đánh trượt đơn hàng (pending -> failed) và hoàn ghế. */
  private async failBooking(
    booking: Booking & { _id: any },
    params: VnpayCallbackParams,
    resultMessage: string,
  ): Promise<VnpaySettlementResult> {
    const ts = () => new Date().toISOString();
    const updated = await this.bookingModel.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      {
        status: 'failed',
        vnpay_trans_no: params.vnp_TransactionNo,
        vnpay_response_code: params.vnp_ResponseCode,
        payment_note: resultMessage,
      },
      { new: true },
    );

    if (updated) {
      await this.seatReservation.releaseSeats(updated);
      this.logger.log(
        `[VnpaySettlement ${ts()}] [FAIL_RELEASE] Đơn ${updated._id} thất bại (responseCode=${params.vnp_ResponseCode}), đã hoàn ghế`,
      );
    }

    return {
      status: 'failed',
      booking: updated ?? booking,
      transId: params.vnp_TransactionNo,
      message: resultMessage,
    };
  }

  /**
   * Tìm booking theo vnpay_txn_ref (ưu tiên), fallback theo bookingId là phần
   * tiền tố trước dấu '-' của txnRef (`${bookingId}-${Date.now()}`).
   */
  private async findBooking(
    txnRef: string,
  ): Promise<(Booking & { _id: any }) | null> {
    const byRef = await this.bookingModel.findOne({ vnpay_txn_ref: txnRef });
    if (byRef) return byRef;

    const bookingId = txnRef.split('-')[0];
    if (bookingId) {
      const byId = await this.bookingModel
        .findById(bookingId)
        .catch(() => null);
      if (byId) return byId;
    }
    return null;
  }

  /**
   * Tích điểm thành viên + ghi nhận sử dụng voucher sau khi thanh toán thành
   * công. Lỗi ở đây không được phép làm hỏng việc xác nhận đơn hàng.
   */
  private async runPostPaymentSideEffects(
    booking: Booking & { _id: any },
  ): Promise<void> {
    try {
      const bookingId = booking._id.toString();
      const userId = this.extractUserId(booking.user);
      if (!userId) {
        this.logger.warn(
          `Thiếu userId khi xử lý sau thanh toán booking=${bookingId}`,
        );
        return;
      }

      await this.loyaltyService.awardPoints(
        userId,
        bookingId,
        booking.total_price,
      );

      if (booking.appliedVoucherCode && booking.voucherDiscount > 0) {
        await this.vouchersService.recordVoucherUsage(
          userId,
          bookingId,
          booking.appliedVoucherCode,
          booking.voucherDiscount,
        );
      }
    } catch (error) {
      this.logger.error('Lỗi xử lý sau thanh toán VNPAY', error);
    }
  }

  private extractUserId(user: any): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    if (user._id) return user._id.toString();
    return user.toString();
  }
}
