import { Injectable, BadRequestException, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MomoService, MomoCallbackParams, MomoPaymentType } from './momo.service';
import { Booking } from '../bookings/schemas/booking.schema';
import { Showtime } from '../showtimes/schemas/showtime.schema';
import { CombosService } from '../combos/combos.service';

export interface CreatePaymentDto {
  showtime_id: string;
  seats: string[];
  user_id: string;
  payment_type?: MomoPaymentType; // Thêm option chọn phương thức: captureWallet | payWithATM | payWithCC
  combos?: Array<{ combo_id: string; quantity: number }>; // Combo bắp nước
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
    private readonly combosService: CombosService,
  ) { }

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

  private normalizeSeats(seats: string[]): string[] {
    if (!Array.isArray(seats) || seats.length === 0) {
      throw new BadRequestException('Vui long chon it nhat mot ghe!');
    }

    const normalized = seats.map((seat) => String(seat).trim()).filter(Boolean);
    if (normalized.length !== seats.length) {
      throw new BadRequestException('Danh sach ghe khong hop le!');
    }

    if (new Set(normalized).size !== normalized.length) {
      throw new BadRequestException('Danh sach ghe bi trung lap!');
    }

    return normalized;
  }

  private async lockSeats(showtimeId: string, seats: string[]): Promise<Showtime> {
    const showtime = await this.showtimeModel.findOneAndUpdate(
      { _id: showtimeId, booked_seats: { $nin: seats } },
      { $addToSet: { booked_seats: { $each: seats } } },
      { new: true },
    );

    if (!showtime) {
      const existingShowtime = await this.showtimeModel.findById(showtimeId);
      if (!existingShowtime) {
        throw new NotFoundException('Suat chieu khong ton tai');
      }
      throw new BadRequestException('Ghe da co nguoi dat!');
    }

    return showtime;
  }

  /**
   * Bước 1: Tạo booking tạm (pending) và URL thanh toán MoMo
   */
  async createMomoPayment(
    createDto: CreatePaymentDto,
  ): Promise<{ payUrl: string; bookingId: string; orderId: string }> {
    const { showtime_id, user_id } = createDto;
    const seats = this.normalizeSeats(createDto.seats);

    // Validate
    if (!user_id) {
      throw new BadRequestException('Bạn cần đăng nhập để đặt vé!');
    }

    // Kiểm tra suất chiếu
    const showtime = await this.showtimeModel.findById(showtime_id);
    if (!showtime) {
      throw new NotFoundException('Suất chiếu không tồn tại');
    }

    // Tính tiền vé
    const ticketPrice = showtime.price * seats.length;

    // Validate và tính tiền combo (nếu có)
    let validatedCombos: Array<{ combo_id: string; name: string; price: number; quantity: number }> = [];
    let comboPrice = 0;

    if (createDto.combos && createDto.combos.length > 0) {
      validatedCombos = await this.combosService.validateCombos(
        createDto.combos,
        showtime.cinema.toString(),
      );
      comboPrice = validatedCombos.reduce((sum, c) => sum + c.price * c.quantity, 0);
    }

    // Tổng tiền = vé + combo
    const totalPrice = ticketPrice + comboPrice;

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
      combos: validatedCombos, // Lưu snapshot combo
      status: 'pending', // Trạng thái chờ thanh toán
      payment_method: 'momo',
      momo_order_id: momoOrderId, // Lưu mã đơn hàng MoMo
    });

    await this.lockSeats(showtime_id, seats);

    let savedBooking: any;
    try {
      savedBooking = await newBooking.save();
    } catch (error) {
      await this.releaseSeats({ showtime: showtime_id, seats });
      throw error;
    }
    const bookingId = savedBooking._id.toString();

    // Notify websocket that booking has been created (seats are booked in DB)
    await this.notifyWebsocket('/internal/booking-completed', {
      showtimeId: showtime_id,
      seats: seats,
    });

    // Encode bookingId vào extraData để có thể lấy lại khi callback
    const extraData = Buffer.from(JSON.stringify({ bookingId })).toString('base64');

    // Tạo URL thanh toán MoMo
    const momoResponse = await this.momoService.createPaymentUrl({
      orderId: momoOrderId,
      amount: totalPrice,
      orderInfo: `Thanh toan ve xem phim - ${seats.length} ghe${validatedCombos.length > 0 ? ` + ${validatedCombos.length} combo` : ''}`,
      extraData: extraData,
      paymentType: createDto.payment_type || 'captureWallet', // Sử dụng payment_type từ request
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
   * Gửi HTTP request notify sang Websocket service
   */
  private async notifyWebsocket(endpoint: string, payload: any): Promise<void> {
    const wsUrl = process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:4001';
    try {
      const response = await fetch(`${wsUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error(`[PaymentsService] Failed to notify websocket: ${response.statusText}`);
      } else {
        console.log(`[PaymentsService] Notified websocket ${endpoint} successfully`);
      }
    } catch (error) {
      console.error(`[PaymentsService] Error notifying websocket at ${wsUrl}${endpoint}:`, error);
    }
  }

  /**
   * Hoàn lại ghế khi thanh toán thất bại
   */
  private async releaseSeats(booking: any): Promise<void> {
    await this.showtimeModel.findByIdAndUpdate(booking.showtime, {
      $pull: { booked_seats: { $in: booking.seats } },
    });

    // Thông báo cho websocket giải phóng các ghế này
    const showtimeId = booking.showtime && booking.showtime._id 
      ? booking.showtime._id.toString() 
      : booking.showtime.toString();

    await this.notifyWebsocket('/internal/booking-released', {
      showtimeId,
      seats: booking.seats,
    });
  }

  /**
   * Thanh toán lại đơn hàng đang Pending
   * - Tạo MoMo orderId MỚI cho cùng booking (MoMo yêu cầu orderId unique mỗi lần)
   * - KHÔNG lock ghế lại (ghế đã được lock từ lần đầu)
   * - Kiểm tra booking chưa expired (còn trong 15 phút)
   */
  async retryPayment(
    bookingId: string,
    userId: string,
    paymentType?: MomoPaymentType,
  ): Promise<{ payUrl: string; bookingId: string; orderId: string }> {
    // 1. Tìm booking pending của user
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      user: userId,
      status: 'pending',
    });

    if (!booking) {
      throw new BadRequestException('Đơn hàng không tồn tại hoặc đã được xử lý');
    }

    // 2. Kiểm tra booking chưa quá hạn (15 phút)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const bookingCreatedAt = (booking as any).createdAt;
    if (bookingCreatedAt && new Date(bookingCreatedAt) < fifteenMinutesAgo) {
      // Booking đã quá hạn → hủy luôn
      await this.releaseSeats(booking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'expired',
        payment_note: 'Hết thời gian thanh toán',
      });
      throw new BadRequestException('Đơn hàng đã hết hạn thanh toán. Vui lòng đặt vé mới.');
    }

    // 3. Tạo MoMo orderId MỚI HOÀN TOÀN
    const newMomoOrderId = this.momoService.generateOrderId();

    // 4. Cập nhật orderId mới vào booking
    await this.bookingModel.findByIdAndUpdate(bookingId, {
      momo_order_id: newMomoOrderId,
    });

    // 5. Mã hóa extraData
    const extraData = Buffer.from(JSON.stringify({ bookingId })).toString('base64');

    // 6. Tạo orderInfo
    const comboCount = booking.combos?.length || 0;
    const orderInfo = `Thanh toan ve xem phim - ${booking.seats.length} ghe${comboCount > 0 ? ` + ${comboCount} combo` : ''}`;

    // 7. Gọi MoMo API với orderId mới
    const momoResponse = await this.momoService.createPaymentUrl({
      orderId: newMomoOrderId,
      amount: booking.total_price,
      orderInfo,
      extraData,
      paymentType: paymentType || 'captureWallet',
    });

    console.log('=== RETRY MOMO PAYMENT ===');
    console.log('BookingId:', bookingId);
    console.log('Old OrderId:', booking.momo_order_id);
    console.log('New OrderId:', newMomoOrderId);
    console.log('Amount:', booking.total_price);
    console.log('MoMo Response:', JSON.stringify(momoResponse, null, 2));

    if (momoResponse.resultCode !== 0) {
      throw new BadRequestException(`Không thể tạo thanh toán MoMo: ${momoResponse.message}`);
    }

    return {
      payUrl: momoResponse.payUrl,
      bookingId,
      orderId: newMomoOrderId,
    };
  }

  /**
   * Hủy đơn hàng pending (user chủ động hủy, không cần chờ cronjob 15 phút)
   * - Release ghế ngay lập tức
   * - Update status = cancelled
   */
  async cancelPendingBooking(bookingId: string, userId: string): Promise<{ message: string }> {
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      user: userId,
      status: 'pending',
    });

    if (!booking) {
      throw new BadRequestException('Đơn hàng không tồn tại hoặc đã được xử lý');
    }

    // Release ghế
    await this.releaseSeats(booking);

    // Update status
    await this.bookingModel.findByIdAndUpdate(bookingId, {
      status: 'cancelled',
      payment_note: 'Người dùng hủy đơn hàng',
    });

    console.log('=== CANCEL PENDING BOOKING ===');
    console.log('BookingId:', bookingId);
    console.log('Seats released:', booking.seats);

    return { message: 'Đã hủy đơn hàng và hoàn lại ghế thành công' };
  }

  /**
   * Kiểm tra trạng thái thanh toán của booking
   */
  async checkPaymentStatus(
    bookingId: string,
    userId: string,
    role?: string,
  ): Promise<{ status: string; booking: any }> {
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

    if (role !== 'admin' && booking.user.toString() !== userId) {
      throw new BadRequestException('Ban khong co quyen xem don dat ve nay');
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
