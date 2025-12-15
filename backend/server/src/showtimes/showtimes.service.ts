import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showtime } from './schemas/showtime.schema';

@Injectable()
export class ShowtimesService {
  constructor(@InjectModel(Showtime.name) private showtimeModel: Model<Showtime>) {}

  // Tìm lịch chiếu theo ID phim
  async findByMovie(movieId: string): Promise<Showtime[]> {
    return this.showtimeModel
      .find({ movie: movieId })
      .populate('cinema') // Lệnh này giúp lấy luôn tên rạp thay vì chỉ lấy ID
      .sort({ start_time: 1 }) // Sắp xếp theo giờ tăng dần
      .exec();
  }
  // Thêm hàm này để tìm 1 lịch chiếu theo ID
  // Lấy chi tiết 1 suất chiếu (để xem ghế nào đã đặt)
  async findOne(id: string): Promise<Showtime> {
    const showtime = await this.showtimeModel
      .findById(id)
      .populate('movie')
      .populate('cinema')
      .exec();

    // Kiểm tra nếu không tìm thấy (null) thì báo lỗi ngay
    if (!showtime) {
      throw new NotFoundException('Không tìm thấy lịch chiếu này!');
    }

    return showtime;
  }
}