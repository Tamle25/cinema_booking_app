import { Body, Controller, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() body: any) {
    // Frontend sẽ gửi lên: { showtimeId: "...", seats: ["A1"], price: 100000 }
    return this.bookingsService.createBooking(body);
  }
}