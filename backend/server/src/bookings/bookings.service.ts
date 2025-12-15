import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'; // <-- Thêm NotFoundException
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from './schemas/booking.schema';
import { Showtime } from '../showtimes/schemas/showtime.schema';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
  ) {}

  async createBooking(body: { showtimeId: string; seats: string[]; price: number }) {
    // 1. Tìm suất chiếu
    const showtime = await this.showtimeModel.findById(body.showtimeId);

    // --- SỬA LỖI TẠI ĐÂY ---
    // Kiểm tra nếu không tìm thấy suất chiếu (null)
    if (!showtime) {
      throw new NotFoundException('Không tìm thấy suất chiếu này!');
    }
    // -----------------------

    // 2. Kiểm tra xem ghế đã bị ai đặt trước chưa
    const isSeatTaken = body.seats.some((seat) => showtime.booked_seats.includes(seat));
    
    if (isSeatTaken) {
      throw new BadRequestException('Ghế này vừa có người đặt rồi! Vui lòng chọn ghế khác.');
    }

    // 3. Tạo vé mới
    const newBooking = new this.bookingModel({
      showtime: body.showtimeId,
      seats: body.seats,
      total_price: body.price,
    });
    await newBooking.save();

    // 4. Cập nhật trạng thái ghế vào suất chiếu
    await this.showtimeModel.findByIdAndUpdate(body.showtimeId, {
      $push: { booked_seats: { $each: body.seats } },
    });

    return newBooking;
  }
}