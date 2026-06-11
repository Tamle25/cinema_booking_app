import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MomoService,
  MomoCallbackParams,
  MomoPaymentType,
} from './momo.service';
import { Booking } from '../bookings/schemas/booking.schema';
import { Showtime } from '../showtimes/schemas/showtime.schema';
import { CombosService } from '../combos/combos.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { User, UserDocument } from '../users/user.schema';

export interface CreatePaymentDto {
  showtime_id: string;
  seats: string[];
  user_id: string;
  payment_type?: MomoPaymentType;
  combos?: Array<{ combo_id: string; quantity: number }>;
  voucherCode?: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  bookingId?: string;
  transactionId?: string;
}

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly momoService: MomoService,
    private readonly combosService: CombosService,
    private readonly loyaltyService: LoyaltyService,
    private readonly vouchersService: VouchersService,
  ) {}

  onModuleInit() {
    this.cleanupInterval = setInterval(
      () => {
        this.cancelExpiredPendingBookings()
          .then((count) => {
            if (count > 0) {
              this.logger.log(`Đã hủy ${count} booking pending hết hạn`);
            }
          })
          .catch((err) => {
            this.logger.error('Lỗi khi hủy booking hết hạn', err);
          });
      },
      5 * 60 * 1000,
    );

    this.cancelExpiredPendingBookings()
      .then((count) => {
        if (count > 0) {
          this.logger.log(
            `Đã hủy ${count} booking pending hết hạn khi khởi động`,
          );
        }
      })
      .catch((err) =>
        this.logger.error('Lỗi khi hủy booking hết hạn lúc khởi động', err),
      );
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
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

  private async lockSeats(
    showtimeId: string,
    seats: string[],
  ): Promise<Showtime> {
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

  async createMomoPayment(
    createDto: CreatePaymentDto,
  ): Promise<{ payUrl: string; bookingId: string; orderId: string }> {
    const { showtime_id, user_id } = createDto;
    const seats = this.normalizeSeats(createDto.seats);

    if (!user_id) {
      throw new BadRequestException('Bạn cần đăng nhập để đặt vé!');
    }

    const showtime = await this.showtimeModel.findById(showtime_id);
    if (!showtime) {
      throw new NotFoundException('Suất chiếu không tồn tại');
    }

    const ticketPrice = showtime.price * seats.length;

    let validatedCombos: Array<{
      combo_id: string;
      name: string;
      price: number;
      quantity: number;
    }> = [];
    let comboPrice = 0;

    if (createDto.combos && createDto.combos.length > 0) {
      validatedCombos = await this.combosService.validateCombos(
        createDto.combos,
        showtime.cinema.toString(),
      );
      comboPrice = validatedCombos.reduce(
        (sum, c) => sum + c.price * c.quantity,
        0,
      );
    }

    const originalPrice = ticketPrice + comboPrice;

    const user = await this.userModel
      .findById(user_id)
      .select('membershipRank');
    const membershipRank = user?.membershipRank || 'Member';
    const membershipDiscountPercent =
      this.loyaltyService.getMembershipDiscount(membershipRank);
    const membershipDiscount = Math.floor(
      (originalPrice * membershipDiscountPercent) / 100,
    );

    let voucherDiscount = 0;
    let appliedVoucherCode = '';
    if (createDto.voucherCode) {
      const cinemaId = showtime.cinema.toString();
      const voucherResult = await this.vouchersService.validateVoucher(
        createDto.voucherCode,
        user_id,
        cinemaId,
        originalPrice - membershipDiscount,
      );
      if (!voucherResult.valid) {
        throw new BadRequestException(voucherResult.message);
      }
      voucherDiscount = voucherResult.discount || 0;
      appliedVoucherCode = createDto.voucherCode.toUpperCase();
    }

    const totalPrice = Math.max(
      originalPrice - membershipDiscount - voucherDiscount,
      0,
    );

    if (totalPrice < 1000) {
      throw new BadRequestException(
        'Số tiền thanh toán tối thiểu là 1,000 VND',
      );
    }

    const momoOrderId = this.momoService.generateOrderId();

    const newBooking = new this.bookingModel({
      showtime: showtime_id,
      user: user_id,
      seats: seats,
      total_price: totalPrice,
      originalPrice: originalPrice,
      membershipDiscount: membershipDiscount,
      voucherDiscount: voucherDiscount,
      appliedVoucherCode: appliedVoucherCode,
      combos: validatedCombos,
      status: 'pending',
      payment_method: 'momo',
      momo_order_id: momoOrderId,
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

    await this.notifyWebsocket('/internal/booking-completed', {
      showtimeId: showtime_id,
      seats: seats,
    });

    const extraData = Buffer.from(JSON.stringify({ bookingId })).toString(
      'base64',
    );

    const momoResponse = await this.momoService.createPaymentUrl({
      orderId: momoOrderId,
      amount: totalPrice,
      orderInfo: `Thanh toan ve xem phim - ${seats.length} ghe${validatedCombos.length > 0 ? ` + ${validatedCombos.length} combo` : ''}`,
      extraData: extraData,
      paymentType: createDto.payment_type || 'captureWallet',
    });

    if (momoResponse.resultCode !== 0) {
      await this.releaseSeats(savedBooking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'failed',
        payment_note: momoResponse.message,
      });
      throw new BadRequestException(
        `Không thể tạo thanh toán MoMo: ${momoResponse.message}`,
      );
    }

    return {
      payUrl: momoResponse.payUrl,
      bookingId,
      orderId: momoOrderId,
    };
  }

  async handleMomoReturn(params: MomoCallbackParams): Promise<PaymentResult> {
    const isValidSignature = this.momoService.verifySignature(params);

    if (!isValidSignature) {
      this.logger.warn('MoMo return signature không hợp lệ');
      return {
        success: false,
        message: 'Chữ ký không hợp lệ! Giao dịch có thể bị giả mạo.',
      };
    }

    const { orderId, resultCode, transId, amount, extraData, message } = params;

    let bookingId: string | undefined;
    try {
      if (extraData) {
        const decodedData = JSON.parse(
          Buffer.from(extraData, 'base64').toString('utf-8'),
        );
        bookingId = decodedData.bookingId;
      }
    } catch {
      this.logger.warn('Không đọc được extraData từ MoMo return');
    }

    let booking;
    if (bookingId) {
      booking = await this.bookingModel.findById(bookingId);
    }
    if (!booking) {
      booking = await this.bookingModel.findOne({ momo_order_id: orderId });
    }

    if (!booking) {
      this.logger.warn(
        `Không tìm thấy booking cho MoMo return orderId=${orderId}`,
      );
      return {
        success: false,
        message: 'Không tìm thấy đơn đặt vé',
      };
    }

    bookingId = booking._id.toString();

    const { success, message: resultMessage } =
      this.momoService.getResultMessage(resultCode);

    if (booking.status === 'confirmed') {
      return {
        success: true,
        message: 'Thanh toán thành công! Vé đã được xác nhận.',
        bookingId,
        transactionId: booking.momo_trans_id,
      };
    }

    if (booking.status === 'failed') {
      return {
        success: false,
        message: booking.payment_note || resultMessage,
        bookingId,
      };
    }

    const isPaymentSuccess = this.momoService.isPaymentSuccess(resultCode);

    if (booking.total_price !== parseInt(amount)) {
      this.logger.warn(`MoMo return amount mismatch booking=${bookingId}`);
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

      await this.postPaymentSuccess(booking);

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

  async handleMomoIPN(
    params: MomoCallbackParams,
  ): Promise<{ resultCode: number; message: string }> {
    try {
      const isValidSignature = this.momoService.verifySignature(params);
      if (!isValidSignature) {
        this.logger.warn('MoMo IPN signature không hợp lệ');
        return { resultCode: 1, message: 'Invalid signature' };
      }

      const { orderId, resultCode, transId, amount, extraData } = params;

      let bookingId: string | undefined;
      try {
        if (extraData) {
          const decodedData = JSON.parse(
            Buffer.from(extraData, 'base64').toString('utf-8'),
          );
          bookingId = decodedData.bookingId;
        }
      } catch {
        this.logger.warn('Không đọc được extraData từ MoMo IPN');
      }

      let booking;
      if (bookingId) {
        booking = await this.bookingModel.findById(bookingId);
      }
      if (!booking) {
        booking = await this.bookingModel.findOne({ momo_order_id: orderId });
      }

      if (!booking) {
        this.logger.warn(
          `Không tìm thấy booking cho MoMo IPN orderId=${orderId}`,
        );
        return { resultCode: 1, message: 'Order not found' };
      }

      bookingId = booking._id.toString();

      if (booking.momo_trans_id === transId && booking.status === 'confirmed') {
        return { resultCode: 0, message: 'Order already confirmed' };
      }

      const orderAmount = booking.total_price;
      if (orderAmount !== parseInt(amount)) {
        this.logger.warn(`MoMo IPN amount mismatch booking=${bookingId}`);
        return { resultCode: 1, message: 'Invalid amount' };
      }

      if (booking.status === 'confirmed') {
        return { resultCode: 0, message: 'Order already confirmed' };
      }

      const isSuccess = this.momoService.isPaymentSuccess(resultCode);
      const { message: resultMessage } =
        this.momoService.getResultMessage(resultCode);

      if (isSuccess) {
        await this.bookingModel.findByIdAndUpdate(bookingId, {
          status: 'confirmed',
          momo_trans_id: transId,
          momo_result_code: resultCode,
          payment_note: resultMessage,
        });

        await this.postPaymentSuccess(booking);

        return { resultCode: 0, message: 'Confirm Success' };
      } else {
        await this.releaseSeats(booking);
        await this.bookingModel.findByIdAndUpdate(bookingId, {
          status: 'failed',
          momo_trans_id: transId,
          momo_result_code: resultCode,
          payment_note: resultMessage,
        });
        return { resultCode: 0, message: 'Confirm Success' };
      }
    } catch (error) {
      this.logger.error('Lỗi xử lý MoMo IPN', error);
      return { resultCode: 1, message: 'Unknown error' };
    }
  }

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
        this.logger.warn(
          `Không thể thông báo websocket ${endpoint}: ${response.statusText}`,
        );
      }
    } catch (error) {
      this.logger.error(`Lỗi thông báo websocket ${wsUrl}${endpoint}`, error);
    }
  }

  private async releaseSeats(booking: any): Promise<void> {
    await this.showtimeModel.findByIdAndUpdate(booking.showtime, {
      $pull: { booked_seats: { $in: booking.seats } },
    });

    const showtimeId =
      booking.showtime && booking.showtime._id
        ? booking.showtime._id.toString()
        : booking.showtime.toString();

    await this.notifyWebsocket('/internal/booking-released', {
      showtimeId,
      seats: booking.seats,
    });
  }

  async retryPayment(
    bookingId: string,
    userId: string,
    paymentType?: MomoPaymentType,
  ): Promise<{ payUrl: string; bookingId: string; orderId: string }> {
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      user: userId,
      status: 'pending',
    });

    if (!booking) {
      throw new BadRequestException(
        'Đơn hàng không tồn tại hoặc đã được xử lý',
      );
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const bookingCreatedAt = (booking as any).createdAt;
    if (bookingCreatedAt && new Date(bookingCreatedAt) < fifteenMinutesAgo) {
      await this.releaseSeats(booking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'expired',
        payment_note: 'Hết thời gian thanh toán',
      });
      throw new BadRequestException(
        'Đơn hàng đã hết hạn thanh toán. Vui lòng đặt vé mới.',
      );
    }

    const newMomoOrderId = this.momoService.generateOrderId();

    await this.bookingModel.findByIdAndUpdate(bookingId, {
      momo_order_id: newMomoOrderId,
    });

    const extraData = Buffer.from(JSON.stringify({ bookingId })).toString(
      'base64',
    );

    const comboCount = booking.combos?.length || 0;
    const orderInfo = `Thanh toan ve xem phim - ${booking.seats.length} ghe${comboCount > 0 ? ` + ${comboCount} combo` : ''}`;

    const momoResponse = await this.momoService.createPaymentUrl({
      orderId: newMomoOrderId,
      amount: booking.total_price,
      orderInfo,
      extraData,
      paymentType: paymentType || 'captureWallet',
    });

    if (momoResponse.resultCode !== 0) {
      throw new BadRequestException(
        `Không thể tạo thanh toán MoMo: ${momoResponse.message}`,
      );
    }

    return {
      payUrl: momoResponse.payUrl,
      bookingId,
      orderId: newMomoOrderId,
    };
  }

  async cancelPendingBooking(
    bookingId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      user: userId,
      status: 'pending',
    });

    if (!booking) {
      throw new BadRequestException(
        'Đơn hàng không tồn tại hoặc đã được xử lý',
      );
    }

    await this.releaseSeats(booking);

    await this.bookingModel.findByIdAndUpdate(bookingId, {
      status: 'cancelled',
      payment_note: 'Người dùng hủy đơn hàng',
    });

    return { message: 'Đã hủy đơn hàng và hoàn lại ghế thành công' };
  }

  async checkPaymentStatus(
    bookingId: string,
    userId: string,
    role?: string,
  ): Promise<{ status: string; booking: any }> {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate({
        path: 'showtime',
        populate: [{ path: 'movie' }, { path: 'cinema' }, { path: 'room' }],
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

  private async postPaymentSuccess(booking: any): Promise<void> {
    try {
      const bookingId = booking._id
        ? booking._id.toString()
        : booking.toString();
      const userId =
        booking.user && booking.user._id
          ? booking.user._id.toString()
          : booking.user
            ? booking.user.toString()
            : '';

      if (!userId || !bookingId) {
        this.logger.warn('Không tìm thấy userId hoặc bookingId sau thanh toán');
        return;
      }

      const pointsAmount = booking.total_price;
      await this.loyaltyService.awardPoints(userId, bookingId, pointsAmount);

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
}
