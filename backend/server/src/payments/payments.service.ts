import { Injectable, BadRequestException, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MomoService, MomoCallbackParams } from './momo.service';
import { Booking } from '../bookings/schemas/booking.schema';
import { Showtime } from '../showtimes/schemas/showtime.schema';

export interface CreatePaymentDto {
  showtime_id: string;
  seats: string[];
  user_id: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  bookingId?: string;
  transactionId?: string;
}

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    private readonly momoService: MomoService,
  ) {}

  /**
   * Khởi động scheduled job khi module load
   * Chạy mỗi 5 phút để hủy các booking pending quá hạn
   */
  onModuleInit() {
    console.log('=== PaymentsService: Starting cleanup scheduler ===');
    // Chạy mỗi 5 phút (300000ms)
    this.cleanupInterval = setInterval(() => {
      this.cancelExpiredPendingBookings()
        .then((count) => {
          if (count > 0) {
            console.log(`[Scheduler] Đã hủy ${count} booking pending hết hạn`);
          }
        })
        .catch((err) => {
          console.error('[Scheduler] Lỗi khi hủy booking hết hạn:', err);
        });
    }, 5 * 60 * 1000);
    
    // Chạy lần đầu ngay khi khởi động
    this.cancelExpiredPendingBookings()
      .then((count) => console.log(`[Init] Đã hủy ${count} booking pending hết hạn`))
      .catch((err) => console.error('[Init] Lỗi:', err));
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      console.log('=== PaymentsService: Cleanup scheduler stopped ===');
    }
  }

  /**
   * Bước 1: Tạo booking tạm (pending) và URL thanh toán MoMo
   */
  async createMomoPayment(
    createDto: CreatePaymentDto,
  ): Promise<{ payUrl: string; bookingId: string; orderId: string }> {
    const { showtime_id, seats, user_id } = createDto;

    // Validate
    if (!user_id) {
      throw new BadRequestException('Bạn cần đăng nhập để đặt vé!');
    }

    // Kiểm tra suất chiếu
    const showtime = await this.showtimeModel.findById(showtime_id);
    if (!showtime) {
      throw new NotFoundException('Suất chiếu không tồn tại');
    }

    // Kiểm tra ghế trống
    const isSeatTaken = seats.some((seat) => showtime.booked_seats.includes(seat));
    if (isSeatTaken) {
      throw new BadRequestException('Ghế đã có người đặt!');
    }

    // Tính tổng tiền
    const totalPrice = showtime.price * seats.length;

    // MoMo yêu cầu số tiền tối thiểu 1000 VND
    if (totalPrice < 1000) {
      throw new BadRequestException('Số tiền thanh toán tối thiểu là 1,000 VND');
    }

    // Tạo mã đơn hàng MoMo
    const momoOrderId = this.momoService.generateOrderId();

    // Tạo booking với trạng thái PENDING (chờ thanh toán)
    const newBooking = new this.bookingModel({
      showtime: showtime_id,
      user: user_id,
      seats: seats,
      total_price: totalPrice,
      status: 'pending', // Trạng thái chờ thanh toán
      payment_method: 'momo',
      momo_order_id: momoOrderId, // Lưu mã đơn hàng MoMo
    });

    const savedBooking = await newBooking.save();
    const bookingId = savedBooking._id.toString();

    // Tạm thời giữ ghế (để tránh người khác đặt)
    await this.showtimeModel.findByIdAndUpdate(showtime_id, {
      $push: { booked_seats: { $each: seats } },
    });

    // Encode bookingId vào extraData để có thể lấy lại khi callback
    const extraData = Buffer.from(JSON.stringify({ bookingId })).toString('base64');

    // Tạo URL thanh toán MoMo
    const momoResponse = await this.momoService.createPaymentUrl({
      orderId: momoOrderId,
      amount: totalPrice,
      orderInfo: `Thanh toan ve xem phim - ${seats.length} ghe`,
      extraData: extraData,
    });

    console.log('=== CREATE MOMO PAYMENT ===');
    console.log('OrderId:', momoOrderId);
    console.log('BookingId:', bookingId);
    console.log('Amount:', totalPrice);
    console.log('MoMo Response:', JSON.stringify(momoResponse, null, 2));

    // Kiểm tra kết quả từ MoMo
    if (momoResponse.resultCode !== 0) {
      // Hoàn ghế nếu tạo payment thất bại
      await this.releaseSeats(savedBooking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'failed',
        payment_note: momoResponse.message,
      });
      throw new BadRequestException(`Không thể tạo thanh toán MoMo: ${momoResponse.message}`);
    }

    return {
      payUrl: momoResponse.payUrl,
      bookingId,
      orderId: momoOrderId,
    };
  }

  /**
   * Bước 2: Xử lý callback từ MoMo (Return URL)
   * 
   * Lưu ý quan trọng: 
   * - Return URL chủ yếu để hiển thị kết quả cho user
   * - Việc cập nhật database chính được xử lý ở IPN URL (an toàn hơn)
   */
  async handleMomoReturn(params: MomoCallbackParams): Promise<PaymentResult> {
    console.log('=== HANDLE MOMO RETURN ===');
    console.log('Params:', JSON.stringify(params, null, 2));

    // Bước 1: Xác thực chữ ký
    const isValidSignature = this.momoService.verifySignature(params);
    console.log('Signature valid:', isValidSignature);

    if (!isValidSignature) {
      console.log('Return: Invalid signature - possible data tampering');
      return {
        success: false,
        message: 'Chữ ký không hợp lệ! Giao dịch có thể bị giả mạo.',
      };
    }

    // Bước 2: Extract thông tin
    const { orderId, resultCode, transId, amount, extraData, message } = params;

    console.log('Return: OrderId:', orderId);
    console.log('Return: ResultCode:', resultCode);
    console.log('Return: TransId:', transId);
    console.log('Return: Amount:', amount);

    // Bước 3: Lấy bookingId từ extraData
    let bookingId: string | undefined;
    try {
      if (extraData) {
        const decodedData = JSON.parse(Buffer.from(extraData, 'base64').toString('utf-8'));
        bookingId = decodedData.bookingId;
      }
    } catch (e) {
      console.log('Return: Failed to decode extraData');
    }

    // Nếu không có bookingId trong extraData, tìm theo momo_order_id
    let booking;
    if (bookingId) {
      booking = await this.bookingModel.findById(bookingId);
    }
    if (!booking) {
      booking = await this.bookingModel.findOne({ momo_order_id: orderId });
    }

    if (!booking) {
      console.log('Return: Booking not found for OrderId:', orderId);
      return {
        success: false,
        message: 'Không tìm thấy đơn đặt vé',
      };
    }

    bookingId = booking._id.toString();
    console.log('Return: Found booking:', bookingId, 'Status:', booking.status);

    // Bước 4: Xử lý kết quả thanh toán
    const { success, message: resultMessage } = this.momoService.getResultMessage(resultCode);

    // Nếu booking đã được xử lý bởi IPN, chỉ trả về kết quả
    if (booking.status === 'confirmed') {
      console.log('Return: Booking already confirmed by IPN');
      return {
        success: true,
        message: 'Thanh toán thành công! Vé đã được xác nhận.',
        bookingId,
        transactionId: booking.momo_trans_id,
      };
    }

    if (booking.status === 'failed') {
      console.log('Return: Booking already marked as failed');
      return {
        success: false,
        message: booking.payment_note || resultMessage,
        bookingId,
      };
    }

    // Nếu IPN chưa xử lý (pending), cập nhật tại đây như fallback
    console.log('Return: IPN has not processed yet, updating as fallback');

    const isPaymentSuccess = this.momoService.isPaymentSuccess(resultCode);

    // Kiểm tra số tiền khớp
    if (booking.total_price !== parseInt(amount)) {
      console.log('Return: Amount mismatch:', booking.total_price, '!=', amount);
      await this.releaseSeats(booking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'failed',
        momo_trans_id: transId,
        payment_note: 'Số tiền không khớp',
      });
      return {
        success: false,
        message: 'Số tiền thanh toán không khớp với đơn hàng',
      };
    }

    if (isPaymentSuccess) {
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'confirmed',
        momo_trans_id: transId,
        momo_result_code: resultCode,
        payment_note: resultMessage,
      });
      return {
        success: true,
        message: 'Thanh toán thành công! Vé đã được xác nhận.',
        bookingId,
        transactionId: transId,
      };
    } else {
      await this.releaseSeats(booking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'failed',
        momo_trans_id: transId,
        momo_result_code: resultCode,
        payment_note: resultMessage,
      });
      return {
        success: false,
        message: resultMessage,
        bookingId,
      };
    }
  }

  /**
   * Bước 3: Xử lý IPN từ MoMo (Server-to-Server callback)
   * 
   * MoMo sẽ gọi POST đến IPN URL khi có kết quả thanh toán
   * Đây là URL server-call-server, MoMo gọi trực tiếp vào server merchant
   */
  async handleMomoIPN(params: MomoCallbackParams): Promise<{ resultCode: number; message: string }> {
    console.log('=== HANDLE MOMO IPN (Server-to-Server) ===');
    console.log('IPN Params:', JSON.stringify(params, null, 2));

    try {
      // Bước 1: Xác thực chữ ký
      const isValidSignature = this.momoService.verifySignature(params);
      if (!isValidSignature) {
        console.log('IPN: Invalid signature');
        return { resultCode: 1, message: 'Invalid signature' };
      }
      console.log('IPN: Signature valid');

      // Bước 2: Extract thông tin
      const { orderId, resultCode, transId, amount, extraData } = params;

      console.log('IPN: OrderId:', orderId);
      console.log('IPN: ResultCode:', resultCode);
      console.log('IPN: TransId:', transId);
      console.log('IPN: Amount:', amount);

      // Bước 3: Lấy bookingId từ extraData
      let bookingId: string | undefined;
      try {
        if (extraData) {
          const decodedData = JSON.parse(Buffer.from(extraData, 'base64').toString('utf-8'));
          bookingId = decodedData.bookingId;
        }
      } catch (e) {
        console.log('IPN: Failed to decode extraData');
      }

      // Tìm booking
      let booking;
      if (bookingId) {
        booking = await this.bookingModel.findById(bookingId);
      }
      if (!booking) {
        booking = await this.bookingModel.findOne({ momo_order_id: orderId });
      }

      if (!booking) {
        console.log('IPN: Order not found for OrderId:', orderId);
        return { resultCode: 1, message: 'Order not found' };
      }

      bookingId = booking._id.toString();
      console.log('IPN: Found order:', bookingId, 'Status:', booking.status);

      // Bước 4: Kiểm tra đã xử lý chưa
      if (booking.momo_trans_id === transId && booking.status === 'confirmed') {
        console.log('IPN: Transaction already processed:', transId);
        return { resultCode: 0, message: 'Order already confirmed' };
      }

      // Bước 5: Kiểm tra số tiền
      const orderAmount = booking.total_price;
      if (orderAmount !== parseInt(amount)) {
        console.log('IPN: Amount mismatch. Expected:', orderAmount, 'Received:', amount);
        return { resultCode: 1, message: 'Invalid amount' };
      }
      console.log('IPN: Amount matched:', amount, 'VND');

      // Bước 6: Kiểm tra trạng thái
      if (booking.status === 'confirmed') {
        console.log('IPN: Order already confirmed');
        return { resultCode: 0, message: 'Order already confirmed' };
      }

      // Bước 7: Xử lý kết quả thanh toán
      const isSuccess = this.momoService.isPaymentSuccess(resultCode);
      const { message: resultMessage } = this.momoService.getResultMessage(resultCode);

      console.log('IPN: ResultCode:', resultCode, 'isSuccess:', isSuccess);

      if (isSuccess) {
        await this.bookingModel.findByIdAndUpdate(bookingId, {
          status: 'confirmed',
          momo_trans_id: transId,
          momo_result_code: resultCode,
          payment_note: resultMessage,
        });
        console.log('IPN: Payment confirmed successfully');
        return { resultCode: 0, message: 'Confirm Success' };
      } else {
        // Thanh toán thất bại -> Hoàn ghế
        await this.releaseSeats(booking);
        await this.bookingModel.findByIdAndUpdate(bookingId, {
          status: 'failed',
          momo_trans_id: transId,
          momo_result_code: resultCode,
          payment_note: resultMessage,
        });
        console.log('IPN: Payment failed, seats released. ResultCode:', resultCode);
        // Vẫn trả về 0 để MoMo biết đã xử lý xong
        return { resultCode: 0, message: 'Confirm Success' };
      }
    } catch (error) {
      console.error('IPN Error:', error);
      return { resultCode: 1, message: 'Unknown error' };
    }
  }

  /**
   * Hoàn lại ghế khi thanh toán thất bại
   */
  private async releaseSeats(booking: any): Promise<void> {
    await this.showtimeModel.findByIdAndUpdate(booking.showtime, {
      $pull: { booked_seats: { $in: booking.seats } },
    });
  }

  /**
   * Kiểm tra trạng thái thanh toán của booking
   */
  async checkPaymentStatus(bookingId: string): Promise<{ status: string; booking: any }> {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie' },
          { path: 'cinema' },
          { path: 'room' },
        ],
      })
      .exec();

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt vé');
    }

    return {
      status: booking.status,
      booking,
    };
  }

  /**
   * Hủy booking pending quá hạn (chạy định kỳ)
   */
  async cancelExpiredPendingBookings(): Promise<number> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expiredBookings = await this.bookingModel.find({
      status: 'pending',
      createdAt: { $lt: fifteenMinutesAgo },
    });

    for (const booking of expiredBookings) {
      await this.releaseSeats(booking);
      await this.bookingModel.findByIdAndUpdate(booking._id, {
        status: 'expired',
        payment_note: 'Hết thời gian thanh toán',
      });
    }

    return expiredBookings.length;
  }
}
