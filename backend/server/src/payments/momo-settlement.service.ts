import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MomoService, MomoCallbackParams } from './momo.service';
import { SeatReservationService } from './seat-reservation.service';
import { Booking } from '../bookings/schemas/booking.schema';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { VouchersService } from '../vouchers/vouchers.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Kết quả chuẩn hoá sau khi đối soát một callback của MoMo với đơn hàng.
 * Dùng chung cho cả luồng redirect (return) và IPN.
 */
export type SettlementStatus =
  | 'confirmed' // Vừa xác nhận thành công trong lần gọi này
  | 'already_confirmed' // Đã được xác nhận trước đó (idempotent)
  | 'failed' // Giao dịch thất bại / bị từ chối
  | 'already_failed' // Đã ở trạng thái thất bại/huỷ/hết hạn trước đó
  | 'pending' // Chưa kết luận (đang chờ tín hiệu khác)
  | 'invalid_signature'
  | 'not_found'
  | 'order_mismatch'
  | 'request_mismatch'
  | 'amount_mismatch'
  | 'invalid_shape';

export interface SettlementResult {
  status: SettlementStatus;
  booking?: Booking & { _id: any };
  message: string;
  transId?: string;
}

/** Kết quả trả về cho frontend ở luồng redirect. */
export interface PaymentResult {
  success: boolean;
  message: string;
  bookingId?: string;
  transactionId?: string;
  status?: string;
}

const FINAL_FAILED_STATUSES = ['failed', 'expired', 'cancelled'];

/**
 * Chịu trách nhiệm DUY NHẤT cho việc đối soát callback thanh toán MoMo và cập
 * nhật trạng thái đơn hàng một cách idempotent.
 *
 * Cả IPN (server-to-server) lẫn redirect (browser) đều đi qua {@link settle}
 * nên logic xác thực + cập nhật chỉ tồn tại ở một nơi, không bị lặp và không
 * thể xử lý lệch nhau. Việc cập nhật trạng thái dùng update có điều kiện
 * (`status: 'pending'`) để đảm bảo dù IPN và redirect chạy đồng thời thì đơn
 * hàng cũng chỉ được xác nhận/đánh-trượt đúng một lần.
 */
@Injectable()
export class MomoSettlementService {
  private readonly logger = new Logger(MomoSettlementService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    private readonly momoService: MomoService,
    private readonly seatReservation: SeatReservationService,
    private readonly loyaltyService: LoyaltyService,
    private readonly vouchersService: VouchersService,
  ) {}

  /**
   * Đối soát một callback MoMo với đơn hàng và cập nhật trạng thái nếu cần.
   * Hàm này là nguồn chân lý duy nhất, an toàn để gọi lại nhiều lần.
   */
  async settle(
    params: MomoCallbackParams,
    source: 'ipn' | 'return' | 'query',
  ): Promise<SettlementResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[MomoSettlementService ${ts()}] [SETTLE_START] Source: ${source}, Params: ${JSON.stringify(params)}`,
    );

    const logFilePath = path.join(process.cwd(), 'momo_debug.log');
    const logData =
      `[${new Date().toISOString()}] CALLBACK RECEIVE (${source})\n` +
      `Params: ${JSON.stringify(params, null, 2)}\n\n`;
    fs.appendFileSync(logFilePath, logData);

    const missing = this.momoService.validateCallbackShape(params);
    if (missing.length > 0) {
      this.logger.warn(
        `[MomoSettlementService ${ts()}] [SETTLE_INVALID_SHAPE] MoMo ${source} thiếu trường bắt buộc: ${missing.join(', ')}`,
      );
      return {
        status: 'invalid_shape',
        message: 'Dữ liệu callback không hợp lệ',
      };
    }

    const { orderId, resultCode, amount, extraData } = params;

    const booking = await this.findBooking(orderId, extraData);
    if (!booking) {
      this.logger.warn(
        `[MomoSettlementService ${ts()}] [SETTLE_BOOKING_NOT_FOUND] MoMo ${source} không tìm thấy booking orderId=${orderId}`,
      );
      return { status: 'not_found', message: 'Không tìm thấy đơn đặt vé' };
    }

    this.logger.log(
      `[MomoSettlementService ${ts()}] [SETTLE_BOOKING_FOUND] BookingId: ${booking._id}, status=${booking.status}, price=${booking.total_price}, momoOrderId=${booking.momo_order_id}`,
    );

    // Đã ở trạng thái cuối => idempotent, không xử lý lại.
    // Kiểm tra trước để tránh lỗi lệch chữ ký do URL decode ở redirect callback (GET return).
    if (booking.status === 'confirmed') {
      this.logger.log(
        `[MomoSettlementService ${ts()}] [SETTLE_ALREADY_CONFIRMED] Booking ${booking._id} was already confirmed previously.`,
      );
      return {
        status: 'already_confirmed',
        booking,
        transId: booking.momo_trans_id,
        message: 'Thanh toán thành công! Vé đã được xác nhận.',
      };
    }
    if (FINAL_FAILED_STATUSES.includes(booking.status)) {
      this.logger.log(
        `[MomoSettlementService ${ts()}] [SETTLE_ALREADY_FAILED] Booking ${booking._id} is already in final failed status: ${booking.status}`,
      );
      return {
        status: 'already_failed',
        booking,
        message: booking.payment_note || 'Giao dịch không thành công',
      };
    }

    // Nguồn 'query' là kết quả gọi trực tiếp tới MoMo (server-to-server qua HTTPS),
    // không phải callback inbound nên không thể bị giả mạo và cũng không mang chữ ký
    // theo định dạng callback => bỏ qua verifySignature cho riêng nguồn này.
    if (source !== 'query' && !this.momoService.verifySignature(params)) {
      this.logger.warn(
        `[MomoSettlementService ${ts()}] [SETTLE_INVALID_SIGNATURE] MoMo ${source} chữ ký không hợp lệ orderId=${orderId}`,
      );
      return {
        status: 'invalid_signature',
        message: 'Chữ ký không hợp lệ! Giao dịch có thể bị giả mạo.',
      };
    }

    // Đối chiếu định danh giao dịch để chống nhầm/giả mạo đơn hàng.
    const bookingIdStr = booking._id.toString();
    const isOrderMatched =
      booking.momo_order_id === orderId || orderId.startsWith(bookingIdStr);
    if (!isOrderMatched) {
      this.logger.warn(
        `[MomoSettlementService ${ts()}] [SETTLE_ORDER_MISMATCH] booking.momo_order_id (${booking.momo_order_id}) !== orderId (${orderId}) and does not start with bookingId (${bookingIdStr})`,
      );
      return {
        status: 'order_mismatch',
        booking,
        message: 'Mã đơn hàng không khớp',
      };
    }

    if (booking.total_price !== Number(amount)) {
      this.logger.warn(
        `[MomoSettlementService ${ts()}] [SETTLE_AMOUNT_MISMATCH] MoMo ${source} số tiền không khớp booking=${booking._id} expected=${booking.total_price} got=${amount}`,
      );
      return {
        status: 'amount_mismatch',
        booking,
        message: 'Số tiền thanh toán không khớp với đơn hàng',
      };
    }

    const isSuccess = this.momoService.isPaymentSuccess(resultCode);
    const { message: resultMessage } =
      this.momoService.getResultMessage(resultCode);

    this.logger.log(
      `[MomoSettlementService ${ts()}] [SETTLE_DECISION] Booking ${booking._id} isSuccess=${isSuccess}, resultCode=${resultCode}, message=${resultMessage}`,
    );

    return isSuccess
      ? this.confirmBooking(booking, params, resultMessage)
      : this.failBooking(booking, params, resultMessage);
  }

  /**
   * Xử lý redirect (browser quay về sau khi thanh toán).
   *
   * Đây là điểm mấu chốt của bản sửa lỗi: luồng redirect TỰ xác nhận đơn hàng
   * (qua {@link settle}) thay vì chỉ chờ IPN. Nhờ vậy đơn hàng luôn được cập
   * nhật và vé được tạo ngay cả khi IPN (cần URL public) chưa/không tới được.
   */
  async handleReturn(params: MomoCallbackParams): Promise<PaymentResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[MomoSettlementService ${ts()}] [HANDLE_RETURN_START] Received return params`,
    );
    const result = await this.settle(params, 'return');
    const booking = result.booking;

    const success =
      result.status === 'confirmed' || result.status === 'already_confirmed';

    this.logger.log(
      `[MomoSettlementService ${ts()}] [HANDLE_RETURN_END] success=${success}, bookingId=${booking?._id}, status=${booking?.status}, statusResult=${result.status}`,
    );
    return {
      success,
      message: result.message,
      bookingId: booking?._id?.toString(),
      transactionId: result.transId || booking?.momo_trans_id,
      status: booking?.status,
    };
  }

  /**
   * Xử lý IPN (server-to-server). Trả về đúng định dạng MoMo yêu cầu:
   * `resultCode: 0` nghĩa là merchant đã ghi nhận callback hợp lệ (kể cả khi
   * giao dịch thất bại), `resultCode: 1` cho dữ liệu không hợp lệ để MoMo retry.
   */
  async handleIpn(
    params: MomoCallbackParams,
  ): Promise<{ resultCode: number; message: string }> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[MomoSettlementService ${ts()}] [HANDLE_IPN_START] Received IPN params`,
    );
    try {
      const result = await this.settle(params, 'ipn');

      const rejected: SettlementStatus[] = [
        'invalid_shape',
        'invalid_signature',
        'not_found',
        'order_mismatch',
        'request_mismatch',
        'amount_mismatch',
      ];

      if (rejected.includes(result.status)) {
        this.logger.warn(
          `[MomoSettlementService ${ts()}] [HANDLE_IPN_REJECTED] Rejected IPN status: ${result.status}, reason: ${result.message}`,
        );
        return { resultCode: 1, message: result.message };
      }
      this.logger.log(
        `[MomoSettlementService ${ts()}] [HANDLE_IPN_SUCCESS] Successfully processed IPN status: ${result.status}`,
      );
      return { resultCode: 0, message: 'Confirm Success' };
    } catch (error) {
      this.logger.error(
        `[MomoSettlementService ${ts()}] [HANDLE_IPN_ERROR] Error in handleIpn`,
        error,
      );
      return { resultCode: 1, message: 'Unknown error' };
    }
  }

  /** Xác nhận đơn hàng (chuyển pending -> confirmed) một cách nguyên tử. */
  private async confirmBooking(
    booking: Booking & { _id: any },
    params: MomoCallbackParams,
    resultMessage: string,
  ): Promise<SettlementResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[MomoSettlementService ${ts()}] [CONFIRM_BOOKING_DB_UPDATE] Updating booking status to confirmed. ID=${booking._id}`,
    );
    const updated = await this.bookingModel.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      {
        status: 'confirmed',
        momo_trans_id: params.transId,
        momo_result_code: String(params.resultCode),
        payment_note: resultMessage,
      },
      { new: true },
    );

    // Update không khớp => một tiến trình khác (IPN/return) đã xử lý trước.
    if (!updated) {
      this.logger.log(
        `[MomoSettlementService ${ts()}] [CONFIRM_BOOKING_CONCURRENT] Concurrent update. Booking ${booking._id} status is no longer pending.`,
      );
      const fresh = await this.bookingModel.findById(booking._id);
      const confirmed = fresh?.status === 'confirmed';
      return {
        status: confirmed ? 'already_confirmed' : 'pending',
        booking: fresh ?? booking,
        transId: fresh?.momo_trans_id,
        message: confirmed
          ? 'Thanh toán thành công! Vé đã được xác nhận.'
          : 'Đang xác minh thanh toán.',
      };
    }

    // Chỉ chạy hiệu ứng phụ ĐÚNG MỘT LẦN, ngay sau khi giành được transition.
    this.logger.log(
      `[MomoSettlementService ${ts()}] [CONFIRM_BOOKING_POST_EFFECTS] Executing post-payment side effects for booking ${updated._id}`,
    );
    await this.runPostPaymentSideEffects(updated);

    const showtimeId =
      typeof updated.showtime === 'object' &&
      updated.showtime !== null &&
      '_id' in updated.showtime
        ? (updated.showtime as any)._id.toString()
        : updated.showtime.toString();
    await this.seatReservation.markSeatsBooked(showtimeId, updated.seats);

    this.logger.log(
      `[MomoSettlementService ${ts()}] [CONFIRM_BOOKING_SUCCESS] Đơn hàng ${updated._id} đã được xác nhận thanh toán`,
    );
    return {
      status: 'confirmed',
      booking: updated,
      transId: params.transId,
      message: 'Thanh toán thành công! Vé đã được xác nhận.',
    };
  }

  /** Đánh trượt đơn hàng (pending -> failed) và hoàn ghế. */
  private async failBooking(
    booking: Booking & { _id: any },
    params: MomoCallbackParams,
    resultMessage: string,
  ): Promise<SettlementResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[MomoSettlementService ${ts()}] [FAIL_BOOKING_DB_UPDATE] Updating booking status to failed. ID=${booking._id}, note=${resultMessage}`,
    );
    const updated = await this.bookingModel.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      {
        status: 'failed',
        momo_trans_id: params.transId,
        momo_result_code: String(params.resultCode),
        payment_note: resultMessage,
      },
      { new: true },
    );

    if (updated) {
      this.logger.log(
        `[MomoSettlementService ${ts()}] [FAIL_BOOKING_RELEASE_SEATS] Releasing seats in DB and notifying Websocket. ID=${updated._id}, seats=${updated.seats.join(',')}`,
      );
      await this.seatReservation.releaseSeats(updated);
      this.logger.log(
        `[MomoSettlementService ${ts()}] [FAIL_BOOKING_RELEASE_SUCCESS] Đơn hàng ${updated._id} thất bại (resultCode=${params.resultCode}), đã hoàn ghế`,
      );
    } else {
      this.logger.log(
        `[MomoSettlementService ${ts()}] [FAIL_BOOKING_CONCURRENT] Concurrent update. Booking ${booking._id} status is no longer pending.`,
      );
    }

    return {
      status: 'failed',
      booking: updated ?? booking,
      transId: params.transId,
      message: resultMessage,
    };
  }

  /**
   * Tìm booking theo bookingId trong extraData (ưu tiên) rồi fallback theo
   * momo_order_id để vẫn xử lý được khi extraData bị thiếu/lỗi.
   */
  private async findBooking(
    orderId: string,
    extraData?: string,
  ): Promise<(Booking & { _id: any }) | null> {
    const { bookingId } = this.momoService.parseExtraData(extraData);

    if (bookingId) {
      const byId = await this.bookingModel.findById(bookingId);
      if (byId) return byId;
    }
    return this.bookingModel.findOne({
      momo_order_id: orderId,
    });
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
      this.logger.error('Lỗi xử lý sau thanh toán', error);
    }
  }

  private extractUserId(user: any): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    if (user._id) return user._id.toString();
    return user.toString();
  }

  /**
   * DEV ONLY — Giả lập thanh toán thành công cho một booking đang pending.
   * Bypass signature check, gọi thẳng confirmBooking() với params giả.
   * Chỉ được gọi từ endpoint dev (NODE_ENV !== 'production').
   */
  async simulateSuccess(bookingId: string): Promise<{
    success: boolean;
    message: string;
    bookingId: string;
    status: string;
  }> {
    const ts = () => new Date().toISOString();
    this.logger.warn(
      `[MomoSettlementService ${ts()}] [DEV_SIMULATE_SUCCESS] Simulating success for bookingId=${bookingId}`,
    );

    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      return {
        success: false,
        message: 'Không tìm thấy booking',
        bookingId,
        status: 'not_found',
      };
    }
    if (booking.status !== 'pending') {
      return {
        success: false,
        message: `Booking đang ở trạng thái "${booking.status}", không thể simulate (chỉ pending mới được)`,
        bookingId,
        status: booking.status,
      };
    }

    const mockParams: MomoCallbackParams = {
      partnerCode: 'MOMO',
      orderId: (booking as any).momo_order_id ?? `DEV-${bookingId}`,
      requestId: (booking as any).momo_request_id ?? `DEV-REQ-${bookingId}`,
      amount: String(booking.total_price),
      orderInfo: 'DEV simulate success',
      orderType: 'momo_wallet',
      transId: `DEV-TRANS-${Date.now()}`,
      resultCode: '0',
      message: 'Giao dịch thành công',
      payType: 'qr',
      responseTime: String(Date.now()),
      extraData: this.momoService.buildExtraData({ bookingId }),
      signature: '',
    };

    const result = await this.confirmBooking(
      booking,
      mockParams,
      'Giao dịch thành công',
    );

    return {
      success:
        result.status === 'confirmed' || result.status === 'already_confirmed',
      message: result.message,
      bookingId,
      status: result.status,
    };
  }
}
