import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

  private normalizeSeats(seats: string[]): string[] {
    if (!Array.isArray(seats) || seats.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một ghế!');
    }

    const normalized = seats.map((seat) => String(seat).trim()).filter(Boolean);
    if (normalized.length !== seats.length) {
      throw new BadRequestException('Danh sách ghế không hợp lệ!');
    }

    if (new Set(normalized).size !== normalized.length) {
      throw new BadRequestException('Danh sách ghế bị trùng lặp!');
    }

    return normalized;
  }

  private async releaseSeats(
    showtimeId: string,
    seats: string[],
  ): Promise<void> {
    await this.showtimeModel.findByIdAndUpdate(showtimeId, {
      $pull: { booked_seats: { $in: seats } },
    });
  }

  async createBooking(createDto: CreateBookingDto): Promise<Booking> {
    const { showtime_id, user_id } = createDto;
    const seats = this.normalizeSeats(createDto.seats);

    if (!user_id) {
      throw new BadRequestException('Bạn cần đăng nhập để đặt vé!');
    }

    const showtime = await this.showtimeModel.findOneAndUpdate(
      { _id: showtime_id, booked_seats: { $nin: seats } },
      { $addToSet: { booked_seats: { $each: seats } } },
      { new: true },
    );

    if (!showtime) {
      const existingShowtime = await this.showtimeModel.findById(showtime_id);
      if (!existingShowtime) {
        throw new NotFoundException('Suat chieu không tồn tại');
      }
      throw new BadRequestException('Ghế đã có người đặt!');
    }

    const newBooking = new this.bookingModel({
      showtime: showtime_id,
      user: user_id,
      seats,
      total_price: showtime.price * seats.length,
    });

    try {
      return await newBooking.save();
    } catch (error) {
      await this.releaseSeats(showtime_id, seats);
      throw error;
    }
  }

  async findByUser(userId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ user: userId })
      .populate({
        path: 'showtime',
        populate: [{ path: 'movie' }, { path: 'cinema' }, { path: 'room' }],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(): Promise<Booking[]> {
    return this.bookingModel
      .find()
      .populate({
        path: 'showtime',
        populate: [{ path: 'movie' }, { path: 'cinema' }, { path: 'room' }],
      })
      .populate('user', '-password')
      .sort({ createdAt: -1 })
      .exec();
  }
}
