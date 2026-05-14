import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminOnly } from '../common/decorators/admin.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Lấy tất cả bookings (cho admin)
  @Get()
  @AdminOnly()
  async findAll() {
    return this.bookingsService.findAll();
  }

  // Yêu cầu đăng nhập mới được đặt vé
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    // Lấy user_id từ JWT token (req.user được set bởi JwtStrategy)
    const userId = req.user._id || req.user.id;
    return this.bookingsService.createBooking({
      ...body,
      user_id: userId,
    });
  }

  // Lấy danh sách vé của user đang đăng nhập
  @UseGuards(AuthGuard('jwt'))
  @Get('my-bookings')
  async getMyBookings(@Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.bookingsService.findByUser(userId);
  }
}
