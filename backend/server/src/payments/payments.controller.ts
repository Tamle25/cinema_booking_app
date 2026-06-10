import { Body, Controller, Post, Get, Query, Req, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import type { MomoCallbackParams } from './momo.service';
import type { Request } from 'express';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Post('create-momo')
  async createMomoPayment(
    @Body() body: { showtime_id: string; seats: string[]; payment_type?: string; combos?: Array<{ combo_id: string; quantity: number }>; voucherCode?: string },
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

  @Get('momo-return')
  async momoReturn(@Query() query: Record<string, string>) {
    const result = await this.paymentsService.handleMomoReturn(query as unknown as MomoCallbackParams);
    return result;
  }

  @Post('momo-ipn')
  async momoIPN(@Body() body: MomoCallbackParams) {
    return this.paymentsService.handleMomoIPN(body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status/:bookingId')
  async checkPaymentStatus(
    @Param('bookingId', ParseObjectIdPipe) bookingId: string,
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user._id || req.user.id;
    return this.paymentsService.checkPaymentStatus(bookingId, userId, req.user.role);
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
}
