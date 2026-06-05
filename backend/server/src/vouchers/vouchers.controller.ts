import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Query, Req, Param, UseGuards, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VouchersService } from './vouchers.service';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ==========================================
  // USER APIs
  // ==========================================

  /**
   * Lấy danh sách voucher có thể đổi bằng điểm
   * GET /vouchers/exchangeable
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('exchangeable')
  async getExchangeableVouchers(@Req() req: any) {
    const userId = req.user._id || req.user.id;
    return this.vouchersService.getExchangeableVouchers(userId);
  }

  /**
   * Đổi điểm lấy voucher
   * POST /vouchers/exchange/:templateId
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('exchange/:templateId')
  async exchangeVoucher(
    @Req() req: any,
    @Param('templateId', ParseObjectIdPipe) templateId: string,
  ) {
    const userId = req.user._id || req.user.id;
    return this.vouchersService.exchangeVoucher(userId, templateId);
  }

  /**
   * Lấy danh sách voucher cá nhân
   * GET /vouchers/my-vouchers
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('my-vouchers')
  async getMyVouchers(@Req() req: any) {
    const userId = req.user._id || req.user.id;
    return this.vouchersService.getUserVouchers(userId);
  }

  /**
   * Kiểm tra mã voucher
   * POST /vouchers/validate
   * Body: { code, cinemaId, orderAmount }
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('validate')
  async validateVoucher(
    @Req() req: any,
    @Body() body: ValidateVoucherDto,
  ) {
    const userId = req.user._id || req.user.id;
    return this.vouchersService.validateVoucher(body.code, userId, body.cinemaId, body.orderAmount);
  }

  // ==========================================
  // ADMIN APIs
  // ==========================================

  /**
   * Tạo voucher admin (nhập mã)
   * POST /vouchers/admin/create
   */
  @AdminOnly()
  @Post('admin/create')
  async createAdminVoucher(@Body() body: CreateVoucherDto) {
    return this.vouchersService.createAdminVoucher(body);
  }

  /**
   * Tạo mẫu voucher đổi điểm
   * POST /vouchers/admin/create-template
   */
  @AdminOnly()
  @Post('admin/create-template')
  async createPointExchangeTemplate(@Body() body: CreateVoucherDto) {
    return this.vouchersService.createPointExchangeTemplate(body);
  }

  /**
   * Cập nhật voucher
   * PUT /vouchers/admin/:id
   */
  @AdminOnly()
  @Put('admin/:id')
  async updateVoucher(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateVoucherDto,
  ) {
    return this.vouchersService.updateVoucher(id, body);
  }

  /**
   * Xóa voucher
   * DELETE /vouchers/admin/:id
   */
  @AdminOnly()
  @Delete('admin/:id')
  async deleteVoucher(@Param('id', ParseObjectIdPipe) id: string) {
    return this.vouchersService.deleteVoucher(id);
  }

  /**
   * Bật/tắt voucher
   * PATCH /vouchers/admin/:id/toggle
   */
  @AdminOnly()
  @Patch('admin/:id/toggle')
  async toggleVoucher(@Param('id', ParseObjectIdPipe) id: string) {
    return this.vouchersService.toggleVoucherStatus(id);
  }

  /**
   * Danh sách voucher (admin)
   * GET /vouchers/admin/list?voucherType=&status=&page=1&limit=20
   */
  @AdminOnly()
  @Get('admin/list')
  async getVoucherList(
    @Query('voucherType') voucherType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vouchersService.getVoucherList({
      voucherType,
      status,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
    });
  }

  /**
   * Lịch sử sử dụng voucher (admin)
   * GET /vouchers/admin/usage-history?voucherId=&page=1&limit=20
   */
  @AdminOnly()
  @Get('admin/usage-history')
  async getUsageHistory(
    @Query('voucherId') voucherId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vouchersService.getVoucherUsageHistory({
      voucherId,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
    });
  }
}
