import { Body, Controller, Post, Get, Query, Req, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import type { MomoCallbackParams } from './momo.service';
import { MomoService } from './momo.service';
import type { Request } from 'express';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly momoService: MomoService,
  ) { }

  /**
   * API: Tạo đơn thanh toán MoMo
   * POST /payments/create-momo
   * Body: { showtime_id, seats, payment_type? }
   * payment_type: 'captureWallet' (QR/Ví) | 'payWithATM' (Thẻ ATM) | 'payWithCC' (Thẻ quốc tế)
   * Response: { payUrl, bookingId, orderId }
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('create-momo')
  async createMomoPayment(
    @Body() body: { showtime_id: string; seats: string[]; payment_type?: string; combos?: Array<{ combo_id: string; quantity: number }> },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;

    const createDto: CreatePaymentDto = {
      showtime_id: body.showtime_id,
      seats: body.seats,
      user_id: userId,
      payment_type: (body.payment_type as any) || 'captureWallet',
      combos: body.combos || [],
    };

    return this.paymentsService.createMomoPayment(createDto);
  }

  /**
   * API: MoMo Return URL (GET)
   * Được gọi khi MoMo redirect người dùng về sau thanh toán
   * GET /payments/momo-return?orderId=...&resultCode=...
   */
  @Get('momo-return')
  async momoReturn(@Query() query: Record<string, string>) {
    console.log('=== MOMO RETURN URL CALLED ===');
    console.log('Query params:', JSON.stringify(query, null, 2));

    const result = await this.paymentsService.handleMomoReturn(query as unknown as MomoCallbackParams);

    // Trả về kết quả (Frontend sẽ xử lý hiển thị)
    return result;
  }

  /**
   * API: MoMo IPN URL (POST)
   * Được gọi server-to-server từ MoMo
   * POST /payments/momo-ipn
   */
  @Post('momo-ipn')
  async momoIPN(@Body() body: MomoCallbackParams) {
    console.log('=== MOMO IPN CALLED ===');
    console.log('Body:', JSON.stringify(body, null, 2));

    return this.paymentsService.handleMomoIPN(body);
  }

  /**
   * API: Kiểm tra trạng thái thanh toán
   * GET /payments/status/:bookingId
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('status/:bookingId')
  async checkPaymentStatus(
    @Param('bookingId', ParseObjectIdPipe) bookingId: string,
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.checkPaymentStatus(bookingId, userId, req.user.role);
  }

  /**
   * API: Lấy config MoMo (để debug)
   * GET /payments/config
   */
  @Get('config')
  @AdminOnly()
  async getConfig() {
    return {
      message: 'MoMo Sandbox Configuration',
      note: 'Thông tin dùng để test trên môi trường Sandbox MoMo',
      config: this.momoService.getConfig(),
      testAccount: {
        phone: '0900000000 - 0900000009',
        otp: '000000',
        note: 'Dùng số điện thoại test và OTP này trên app MoMo Test',
      },
    };
  }

  /**
   * API: Thanh toán lại đơn hàng pending
   * POST /payments/retry
   * Body: { bookingId, payment_type? }
   * - Tạo MoMo orderId mới cho cùng booking (không lock ghế lại)
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('retry')
  async retryPayment(
    @Body() body: { bookingId: string; payment_type?: string },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.retryPayment(
      body.bookingId,
      userId,
      (body.payment_type as any) || undefined,
    );
  }

  /**
   * API: Hủy đơn hàng pending (user chủ động hủy, release ghế ngay)
   * POST /payments/cancel-booking
   * Body: { bookingId }
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('cancel-booking')
  async cancelPendingBooking(
    @Body() body: { bookingId: string },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.cancelPendingBooking(body.bookingId, userId);
  }


  /**
   * API: Test tạo URL thanh toán MoMo
   * GET /payments/test-payment
   */
  @Get('test-payment')
  @AdminOnly()
  async testPayment() {
    const orderId = this.momoService.generateOrderId();
    const amount = 10000; // 10,000 VND (minimum amount)

    try {
      const result = await this.momoService.createPaymentUrl({
        orderId: orderId,
        amount: amount,
        orderInfo: 'Test thanh toan MoMo - ' + orderId,
        extraData: '',
      });

      return {
        message: 'Test Payment URL (MoMo Sandbox)',
        config: this.momoService.getConfig(),
        orderId,
        amount,
        response: result,
        payUrl: result.payUrl,
        instructions: 'Mở payUrl trong trình duyệt hoặc scan QR để test',
        testAccount: {
          phone: '0900000000 - 0900000009',
          otp: '000000',
        },
      };
    } catch (error) {
      return {
        message: 'Failed to create test payment',
        error: error instanceof Error ? error.message : 'Unknown error',
        config: this.momoService.getConfig(),
      };
    }
  }

  /**
   * API: Lấy MoMo config đầy đủ và result codes (để debug)
   * GET /payments/momo-config
   */
  @Get('momo-config')
  @AdminOnly()
  async getMomoConfig() {
    return {
      config: this.momoService.getConfig(),
      resultCodes: {
        '0': 'Giao dịch thành công',
        '1000': 'Hệ thống đang bảo trì',
        '1001': 'Tài khoản không đủ số dư',
        '1002': 'Giao dịch bị từ chối',
        '1003': 'Giao dịch bị hủy bỏ',
        '1004': 'Số tiền vượt quá hạn mức',
        '1005': 'URL hoặc QR đã hết hạn',
        '1006': 'Người dùng từ chối thanh toán',
        '1017': 'Giao dịch bị hủy bởi người dùng',
      },
      sandbox: {
        endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
        note: 'Môi trường test MoMo',
      },
    };
  }
}
