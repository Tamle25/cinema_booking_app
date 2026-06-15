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
import { MomoService, MomoPaymentType } from './momo.service';
import { MomoSettlementService } from './momo-settlement.service';
import { SeatReservationService } from './seat-reservation.service';
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

export interface CreatePaymentResult {
  payUrl: string;
  bookingId: string;
  orderId: string;
}

const BOOKING_TTL_MS = 15 * 60 * 1000;

/**
 * Orchestration cho luồng đặt vé + khởi tạo thanh toán MoMo.
 *
 * Lưu ý phân tách trách nhiệm:
 *  - Giữ/giải phóng ghế: {@link SeatReservationService}
 *  - Gọi cổng MoMo + chữ ký: {@link MomoService}
 *  - Đối soát callback + cập nhật đơn: MomoSettlementService (tách riêng)
 */
@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly momoService: MomoService,
    private readonly seatReservation: SeatReservationService,
    private readonly combosService: CombosService,
    private readonly loyaltyService: LoyaltyService,
    private readonly vouchersService: VouchersService,
    private readonly momoSettlementService: MomoSettlementService,
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

    this.cancelExpiredPendingBookings().catch((err) =>
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

  async createMomoPayment(
    createDto: CreatePaymentDto,
  ): Promise<CreatePaymentResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[PaymentsService ${ts()}] [CREATE_MOMO_PAYMENT_START] Dto: ${JSON.stringify(createDto)}`,
    );
    const { showtime_id, user_id } = createDto;
    const seats = this.normalizeSeats(createDto.seats);

    if (!user_id) {
      throw new BadRequestException('Bạn cần đăng nhập để đặt vé!');
    }

    const showtime = await this.showtimeModel.findById(showtime_id);
    if (!showtime) {
      throw new NotFoundException('Suất chiếu không tồn tại');
    }

    const pricing = await this.calculatePricing(createDto, showtime, user_id);

    const newBooking = new this.bookingModel({
      showtime: showtime_id,
      user: user_id,
      seats,
      total_price: pricing.totalPrice,
      originalPrice: pricing.originalPrice,
      membershipDiscount: pricing.membershipDiscount,
      voucherDiscount: pricing.voucherDiscount,
      appliedVoucherCode: pricing.appliedVoucherCode,
      combos: pricing.combos,
      status: 'pending',
      payment_method: 'momo',
    });

    const bookingId = newBooking._id.toString();
    const momoOrderId = `${bookingId}-${Date.now()}`;
    newBooking.momo_order_id = momoOrderId;

    this.logger.log(
      `[PaymentsService ${ts()}] [CREATE_MOMO_PAYMENT_LOCK_SEATS] Attempting to lock seats=${seats.join(',')} for showtime=${showtime_id}`,
    );
    await this.lockSeatsOrThrow(showtime_id, seats);

    let savedBooking: Booking & { _id: any };
    try {
      savedBooking = await newBooking.save();
      this.logger.log(
        `[PaymentsService ${ts()}] [CREATE_MOMO_PAYMENT_BOOKING_SAVED] Booking saved. ID=${savedBooking._id.toString()}, momoOrderId=${momoOrderId}`,
      );
    } catch (error) {
      this.logger.error(
        `[PaymentsService ${ts()}] [CREATE_MOMO_PAYMENT_SAVE_ERROR] Error saving booking, releasing seats. Error: ${error.message}`,
      );
      await this.seatReservation.releaseSeats({ showtime: showtime_id, seats });
      throw error;
    }
    this.logger.log(
      `[PaymentsService ${ts()}] [CREATE_MOMO_PAYMENT_LOCK_PENDING] Syncing seats to Socket.IO. showtime=${showtime_id}, seats=${seats.join(',')}`,
    );
    await this.seatReservation.lockSeatsPending(showtime_id, seats);

    const orderInfo = this.buildOrderInfo(seats.length, pricing.combos.length);

    this.logger.log(
      `[PaymentsService ${ts()}] [CREATE_MOMO_PAYMENT_START_CHECKOUT] Starting MoMo Checkout for bookingId=${bookingId}, orderId=${momoOrderId}`,
    );
    return this.startMomoCheckout(
      bookingId,
      momoOrderId,
      pricing.totalPrice,
      orderInfo,
      createDto.payment_type,
      savedBooking,
    );
  }

  /**
   * Khởi tạo phiên thanh toán MoMo cho một booking đã tồn tại và lưu requestId.
   * Dùng chung cho cả tạo mới lẫn thanh toán lại để tránh lặp code.
   */
  private async startMomoCheckout(
    bookingId: string,
    momoOrderId: string,
    amount: number,
    orderInfo: string,
    paymentType: MomoPaymentType | undefined,
    bookingForRelease: { showtime: any; seats: string[] } | null,
  ): Promise<CreatePaymentResult> {
    const extraData = this.momoService.buildExtraData({ bookingId });

    const momoResponse = await this.momoService.createPaymentUrl({
      orderId: momoOrderId,
      amount,
      orderInfo,
      extraData,
      paymentType: paymentType || 'captureWallet',
    });

    await this.bookingModel.findByIdAndUpdate(bookingId, {
      momo_request_id: momoResponse.requestId,
    });

    if (momoResponse.resultCode !== 0) {
      if (bookingForRelease) {
        await this.seatReservation.releaseSeats(bookingForRelease);
      }
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'failed',
        payment_note: momoResponse.message,
      });
      throw new BadRequestException(
        `Không thể tạo thanh toán MoMo: ${momoResponse.message}`,
      );
    }

    return { payUrl: momoResponse.payUrl, bookingId, orderId: momoOrderId };
  }

  private buildOrderInfo(seatCount: number, comboCount: number): string {
    const comboPart = comboCount > 0 ? ` + ${comboCount} combo` : '';
    return `Thanh toan ve xem phim - ${seatCount} ghe${comboPart}`;
  }

  private async lockSeatsOrThrow(
    showtimeId: string,
    seats: string[],
  ): Promise<void> {
    try {
      await this.seatReservation.lockSeats(showtimeId, seats);
    } catch (error) {
      if (error instanceof Error && error.message === 'SHOWTIME_NOT_FOUND') {
        throw new NotFoundException('Suat chieu khong ton tai');
      }
      if (error instanceof Error && error.message === 'SEATS_ALREADY_TAKEN') {
        throw new BadRequestException('Ghe da co nguoi dat!');
      }
      throw error;
    }
  }

  /** Tính toán giá vé, combo, giảm giá thành viên và voucher. */
  private async calculatePricing(
    createDto: CreatePaymentDto,
    showtime: Showtime,
    userId: string,
  ) {
    const seats = this.normalizeSeats(createDto.seats);
    const ticketPrice = showtime.price * seats.length;

    let combos: Array<{
      combo_id: string;
      name: string;
      price: number;
      quantity: number;
    }> = [];
    let comboPrice = 0;

    if (createDto.combos && createDto.combos.length > 0) {
      combos = await this.combosService.validateCombos(
        createDto.combos,
        showtime.cinema.toString(),
      );
      comboPrice = combos.reduce((sum, c) => sum + c.price * c.quantity, 0);
    }

    const originalPrice = ticketPrice + comboPrice;

    const user = await this.userModel.findById(userId).select('membershipRank');
    const membershipRank = user?.membershipRank || 'Member';
    const membershipDiscountPercent =
      this.loyaltyService.getMembershipDiscount(membershipRank);
    const membershipDiscount = Math.floor(
      (originalPrice * membershipDiscountPercent) / 100,
    );

    let voucherDiscount = 0;
    let appliedVoucherCode = '';
    if (createDto.voucherCode) {
      const voucherResult = await this.vouchersService.validateVoucher(
        createDto.voucherCode,
        userId,
        showtime.cinema.toString(),
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

    return {
      combos,
      originalPrice,
      membershipDiscount,
      voucherDiscount,
      appliedVoucherCode,
      totalPrice,
    };
  }

  async retryPayment(
    bookingId: string,
    userId: string,
    paymentType?: MomoPaymentType,
  ): Promise<CreatePaymentResult> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[PaymentsService ${ts()}] [RETRY_PAYMENT_START] bookingId=${bookingId}, userId=${userId}`,
    );
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      user: userId,
      status: 'pending',
    });

    if (!booking) {
      this.logger.warn(
        `[PaymentsService ${ts()}] [RETRY_PAYMENT_NOT_FOUND] Pending booking not found. ID=${bookingId}, userId=${userId}`,
      );
      throw new BadRequestException(
        'Đơn hàng không tồn tại hoặc đã được xử lý',
      );
    }

    const createdAt = (booking as any).createdAt;
    if (
      createdAt &&
      Date.now() - new Date(createdAt).getTime() > BOOKING_TTL_MS
    ) {
      this.logger.warn(
        `[PaymentsService ${ts()}] [RETRY_PAYMENT_EXPIRED] Booking has expired. ID=${bookingId}, createdAt=${createdAt}`,
      );
      await this.seatReservation.releaseSeats(booking);
      await this.bookingModel.findByIdAndUpdate(bookingId, {
        status: 'expired',
        payment_note: 'Hết thời gian thanh toán',
      });
      throw new BadRequestException(
        'Đơn hàng đã hết hạn thanh toán. Vui lòng đặt vé mới.',
      );
    }

    const newMomoOrderId = `${bookingId}-${Date.now()}`;
    this.logger.log(
      `[PaymentsService ${ts()}] [RETRY_PAYMENT_NEW_ORDER_ID] Generated new momoOrderId=${newMomoOrderId} for bookingId=${bookingId}`,
    );
    await this.bookingModel.findByIdAndUpdate(bookingId, {
      momo_order_id: newMomoOrderId,
    });

    const orderInfo = this.buildOrderInfo(
      booking.seats.length,
      booking.combos?.length || 0,
    );

    // Không hoàn ghế khi tạo lại thất bại: đơn vẫn pending, ghế vẫn thuộc về user.
    return this.startMomoCheckout(
      bookingId,
      newMomoOrderId,
      booking.total_price,
      orderInfo,
      paymentType,
      null,
    );
  }

  async cancelPendingBooking(
    bookingId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const ts = () => new Date().toISOString();
    this.logger.log(
      `[PaymentsService ${ts()}] [CANCEL_PENDING_BOOKING_START] bookingId=${bookingId}, userId=${userId}`,
    );
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      user: userId,
      status: 'pending',
    });

    if (!booking) {
      this.logger.warn(
        `[PaymentsService ${ts()}] [CANCEL_PENDING_BOOKING_NOT_FOUND] Pending booking not found for cancel. ID=${bookingId}, userId=${userId}`,
      );
      throw new BadRequestException(
        'Đơn hàng không tồn tại hoặc đã được xử lý',
      );
    }

    this.logger.log(
      `[PaymentsService ${ts()}] [CANCEL_PENDING_BOOKING_RELEASE] Releasing seats for booking=${bookingId}`,
    );
    await this.seatReservation.releaseSeats(booking);
    await this.bookingModel.findByIdAndUpdate(bookingId, {
      status: 'cancelled',
      payment_note: 'Người dùng hủy đơn hàng',
    });

    this.logger.log(
      `[PaymentsService ${ts()}] [CANCEL_PENDING_BOOKING_SUCCESS] Successfully cancelled booking=${bookingId}`,
    );
    return { message: 'Đã hủy đơn hàng và hoàn lại ghế thành công' };
  }

  async checkPaymentStatus(
    bookingId: string,
    userId: string,
    role?: string,
  ): Promise<{ status: string; booking: any }> {
    let booking = await this.bookingModel
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

    if (booking.status === 'pending') {
      const orderId = booking.momo_order_id;
      const requestId = booking.momo_request_id;
      if (orderId && requestId) {
        try {
          const queryResult = await this.momoService.queryPaymentStatus(
            orderId,
            requestId,
          );

          if (queryResult && queryResult.resultCode === 0) {
            const callbackParams = {
              partnerCode: queryResult.partnerCode,
              orderId: queryResult.orderId,
              requestId: queryResult.requestId,
              amount: String(queryResult.amount),
              orderInfo: queryResult.message || '',
              orderType: 'momo_wallet',
              transId: String(queryResult.transId),
              resultCode: String(queryResult.resultCode),
              message: queryResult.message,
              payType: queryResult.payType || '',
              responseTime: String(queryResult.responseTime),
              extraData: queryResult.extraData || '',
              signature: queryResult.signature,
            };
            await this.momoSettlementService.settle(callbackParams, 'ipn');

            // Re-fetch fresh booking status
            const fresh = await this.bookingModel
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
            if (fresh) {
              booking = fresh;
            }
          }
        } catch (error) {
          this.logger.error(
            `Lỗi khi truy vấn trạng thái MoMo cho booking=${bookingId}`,
            error,
          );
        }
      }
    }

    return { status: booking.status, booking };
  }

  async cancelExpiredPendingBookings(): Promise<number> {
    const threshold = new Date(Date.now() - BOOKING_TTL_MS);

    const expiredBookings = await this.bookingModel.find({
      status: 'pending',
      createdAt: { $lt: threshold },
    });

    let cancelledCount = 0;

    if (expiredBookings.length > 0) {
      await Promise.all(
        expiredBookings.map(async (booking) => {
          const bookingId = booking._id.toString();
          const orderId = booking.momo_order_id;
          const requestId = booking.momo_request_id;

          if (orderId && requestId) {
            try {
              this.logger.log(
                `Kiểm tra trạng thái MoMo trước khi hủy booking hết hạn ID=${bookingId}`,
              );
              const queryResult = await this.momoService.queryPaymentStatus(
                orderId,
                requestId,
              );

              if (queryResult && queryResult.resultCode === 0) {
                this.logger.log(
                  `Khách hàng đã thanh toán thành công cho booking ID=${bookingId} quá hạn. Settle thay vì hủy.`,
                );
                const callbackParams = {
                  partnerCode: queryResult.partnerCode,
                  orderId: queryResult.orderId,
                  requestId: queryResult.requestId,
                  amount: String(queryResult.amount),
                  orderInfo: queryResult.message || '',
                  orderType: 'momo_wallet',
                  transId: String(queryResult.transId),
                  resultCode: String(queryResult.resultCode),
                  message: queryResult.message,
                  payType: queryResult.payType || '',
                  responseTime: String(queryResult.responseTime),
                  extraData: queryResult.extraData || '',
                  signature: queryResult.signature,
                };
                await this.momoSettlementService.settle(callbackParams, 'ipn');
                return;
              }
            } catch (queryErr) {
              this.logger.error(
                `Lỗi khi truy vấn MoMo cho booking quá hạn ID=${bookingId}`,
                queryErr,
              );
            }
          }

          try {
            await this.seatReservation.releaseSeats(booking);
            await this.bookingModel.findByIdAndUpdate(booking._id, {
              status: 'expired',
              payment_note: 'Hết thời gian thanh toán',
            });
            cancelledCount++;
          } catch (err) {
            this.logger.error(
              `Lỗi khi giải phóng booking hết hạn ${booking._id}`,
              err,
            );
          }
        }),
      );
    }

    return cancelledCount;
  }
}
