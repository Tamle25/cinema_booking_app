import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { MomoSettlementService } from './momo-settlement.service';
import { VnpaySettlementService } from './vnpay-settlement.service';
import type { MomoCallbackParams } from './momo.service';
import type { VnpayCallbackParams } from './vnpay.service';
import type { Request, Response } from 'express';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly settlementService: MomoSettlementService,
    private readonly vnpaySettlementService: VnpaySettlementService,
    private readonly configService: ConfigService,
  ) {}

  /** Lấy IP khách hàng để gửi sang VNPAY (vnp_IpAddr). */
  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';
    // VNPAY không chấp nhận dạng IPv6 ::1 cho localhost.
    return ip === '::1' ? '127.0.0.1' : ip;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create-momo')
  async createMomoPayment(
    @Body()
    body: {
      showtime_id: string;
      seats: string[];
      payment_type?: string;
      combos?: Array<{ combo_id: string; quantity: number }>;
      voucherCode?: string;
    },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;

    const createDto: CreatePaymentDto = {
      showtime_id: body.showtime_id,
      seats: body.seats,
      user_id: userId,
      payment_type: (body.payment_type as any) || 'captureWallet',
      combos: body.combos || [],
      voucherCode: body.voucherCode,
    };

    return this.paymentsService.createMomoPayment(createDto);
  }

  @Get('momo/return')
  async momoReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.settlementService.handleReturn(
      query as unknown as MomoCallbackParams,
    );
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const params = new URLSearchParams({
      success: String(result.success),
      bookingId: result.bookingId ?? '',
      status: result.status ?? '',
      message: result.message ?? '',
      transactionId: result.transactionId ?? '',
    });
    return res.redirect(
      303,
      `${frontendUrl}/payment/momo-return?${params.toString()}`,
    );
  }

  @Post('momo/ipn')
  async momoIPN(@Body() body: MomoCallbackParams) {
    return this.settlementService.handleIpn(body);
  }

  // ===================== VNPAY =====================

  @UseGuards(AuthGuard('jwt'))
  @Post('create-vnpay')
  async createVnpayPayment(
    @Body()
    body: {
      showtime_id: string;
      seats: string[];
      bankCode?: string;
      combos?: Array<{ combo_id: string; quantity: number }>;
      voucherCode?: string;
    },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.createVnpayPayment({
      showtime_id: body.showtime_id,
      seats: body.seats,
      user_id: userId,
      ipAddr: this.extractIp(req),
      bankCode: body.bankCode,
      combos: body.combos || [],
      voucherCode: body.voucherCode,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('retry-vnpay')
  async retryVnpayPayment(
    @Body() body: { bookingId: string; bankCode?: string },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.retryVnpayPayment(
      body.bookingId,
      userId,
      this.extractIp(req),
      body.bankCode,
    );
  }

  @Get('vnpay-return')
  async vnpayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.vnpaySettlementService.handleReturn(
      query as VnpayCallbackParams,
    );
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const params = new URLSearchParams({
      success: String(result.success),
      bookingId: result.bookingId ?? '',
      status: result.status ?? '',
      message: result.message ?? '',
      transactionId: result.transactionId ?? '',
      amount: query.vnp_Amount ?? '',
    });
    return res.redirect(
      303,
      `${frontendUrl}/payment/vnpay-return?${params.toString()}`,
    );
  }

  @Get('vnpay-ipn')
  async vnpayIPN(@Query() query: Record<string, string>) {
    return this.vnpaySettlementService.handleIpn(query as VnpayCallbackParams);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status/:bookingId')
  async checkPaymentStatus(
    @Param('bookingId', ParseObjectIdPipe) bookingId: string,
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.checkPaymentStatus(
      bookingId,
      userId,
      req.user.role,
    );
  }

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

  @UseGuards(AuthGuard('jwt'))
  @Post('cancel-booking')
  async cancelPendingBooking(
    @Body() body: { bookingId: string },
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.cancelPendingBooking(body.bookingId, userId);
  }

  @Post('dev/simulate-momo-success')
  async devSimulateMomoSuccess(@Body() body: { bookingId: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Không khả dụng trong production');
    }
    return this.settlementService.simulateSuccess(body.bookingId);
  }
}
