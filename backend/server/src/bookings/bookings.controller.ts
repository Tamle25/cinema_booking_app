import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminOnly } from '../common/decorators/admin.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @AdminOnly()
  async findAll() {
    return this.bookingsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.bookingsService.createBooking({
      ...body,
      user_id: userId,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-bookings')
  async getMyBookings(@Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.bookingsService.findByUser(userId);
  }
}
