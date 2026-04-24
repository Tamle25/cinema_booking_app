import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Showtime } from '../showtimes/schemas/showtime.schema';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
  ) { }

  async createBooking(createDto: CreateBookingDto): Promise<Booking> {
    const { showtime_id, seats, user_id } = createDto;

    // 1. Kiểm tra user_id
    if (!user_id) {
      throw new BadRequestException('Bạn cần đăng nhập để đặt vé!');
    }

    // 2. Kiểm tra suất chiếu
    const showtime = await this.showtimeModel.findById(showtime_id);
    if (!showtime) throw new NotFoundException('Suất chiếu không tồn tại');

    // 3. Kiểm tra ghế trống
    const isSeatTaken = seats.some((seat) => showtime.booked_seats.includes(seat));
    if (isSeatTaken) {
      throw new BadRequestException('Ghế đã có người đặt!');
    }

    // 4. Tạo Booking
    const newBooking = new this.bookingModel({
      showtime: showtime_id,
      user: user_id,
      seats: seats,
      total_price: showtime.price * seats.length
    });

    // 5. Update ghế đã đặt
    await this.showtimeModel.findByIdAndUpdate(showtime_id, {
      $push: { booked_seats: { $each: seats } },
    });

    return newBooking.save();
  }

  // Lấy danh sách vé của một user
  async findByUser(userId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ user: userId })
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie' },
          { path: 'cinema' },
          { path: 'room' }
        ]
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lấy tất cả booking (Admin)
  async findAll(): Promise<Booking[]> {
    return this.bookingModel
      .find()
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie' },
          { path: 'cinema' },
          { path: 'room' }
        ]
      })
      .populate('user', '-password')
      .sort({ createdAt: -1 })
      .exec();
  }
}