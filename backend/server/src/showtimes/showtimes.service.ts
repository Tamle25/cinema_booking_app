import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showtime } from './schemas/showtime.schema';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { MoviesService } from '../movies/movies.service';

// Thời gian dọn phòng sau mỗi suất chiếu (phút)
const BUFFER_MINUTES = 15;

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    private moviesService: MoviesService,
  ) { }

  // ============ VALIDATION METHODS ============

  /**
   * Kiểm tra phim có đang chiếu không (release_date <= now && is_active)
   */
  private async checkMovieAvailable(movieId: string): Promise<any> {
    const movie = await this.moviesService.findOne(movieId);
    if (!movie) {
      throw new NotFoundException('Phim không tồn tại!');
    }
    if (!movie.is_active) {
      throw new BadRequestException('Phim đã ngừng chiếu!');
    }
    // Cho phép tạo suất chiếu cho phim sắp chiếu (release_date > now)
    // Vì admin có thể tạo suất chiếu trước khi phim ra mắt
    return movie;
  }

  /**
   * Kiểm tra thời gian không ở quá khứ
   */
  private checkNotInPast(startTime: Date): void {
    const now = new Date();
    if (startTime <= now) {
      throw new BadRequestException('Không thể tạo suất chiếu trong quá khứ!');
    }
  }

  /**
   * Kiểm tra không trùng lấp thời gian trong cùng phòng
   */
  private async checkNoOverlap(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<void> {
    const filter: any = {
      room: roomId,
      is_active: true,
      $or: [
        // Suất mới bắt đầu trong khoảng suất cũ
        { start_time: { $lt: endTime }, end_time: { $gt: startTime } }
      ]
    };

    // Loại trừ chính nó khi update
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const overlapping = await this.showtimeModel.findOne(filter).exec();

    if (overlapping) {
      const existingStart = new Date(overlapping.start_time).toLocaleString('vi-VN');
      const existingEnd = new Date(overlapping.end_time).toLocaleString('vi-VN');
      throw new ConflictException(
        `Phòng đã có suất chiếu từ ${existingStart} đến ${existingEnd}!`
      );
    }
  }

  // ============ CRUD METHODS ============

  // Lấy tất cả suất chiếu (có phân trang và filter)
  async findAll(query?: {
    page?: number;
    limit?: number;
    cinema_id?: string;
    movie_id?: string;
    date?: string;
  }): Promise<{ data: Showtime[]; total: number; page: number; totalPages: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    // Mặc định chỉ lấy suất chiếu đang hoạt động
    const filter: any = { is_active: true };

    if (query?.cinema_id) {
      filter.cinema = query.cinema_id;
    }
    if (query?.movie_id) {
      filter.movie = query.movie_id;
    }
    if (query?.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.start_time = { $gte: startOfDay, $lte: endOfDay };
    }

    const [data, total] = await Promise.all([
      this.showtimeModel
        .find(filter)
        .populate('movie', 'title poster_url duration')
        .populate('cinema', 'name')
        .populate('room', 'name type')
        .sort({ start_time: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.showtimeModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(createDto: CreateShowtimeDto): Promise<Showtime> {
    const { movie_id, cinema_id, room_id, start_time, ...rest } = createDto;

    // 1. Validate phim tồn tại và đang hoạt động
    const movie = await this.checkMovieAvailable(movie_id);

    // 2. Parse và validate thời gian
    const start = new Date(start_time);
    this.checkNotInPast(start);

    // 3. Tính giờ kết thúc (thời lượng phim + buffer dọn phòng)
    const end = new Date(start.getTime() + (movie.duration + BUFFER_MINUTES) * 60000);

    // 4. Kiểm tra không trùng lấp
    await this.checkNoOverlap(room_id, start, end);

    // 5. Tạo suất chiếu mới
    const newShowtime = new this.showtimeModel({
      ...rest,
      movie: movie_id,
      cinema: cinema_id,
      room: room_id,
      start_time: start,
      end_time: end,
    });

    return newShowtime.save();
  }

  async update(id: string, updateDto: UpdateShowtimeDto): Promise<Showtime> {
    const showtime = await this.showtimeModel.findById(id);
    if (!showtime) {
      throw new NotFoundException('Không tìm thấy suất chiếu!');
    }

    let newStart: Date | undefined;
    let newEnd: Date | undefined;
    let roomId = updateDto.room_id || showtime.room.toString();

    // Nếu có cập nhật thời gian bắt đầu hoặc phim, cần tính lại end_time và validate
    if (updateDto.start_time || updateDto.movie_id) {
      const movieId = updateDto.movie_id || showtime.movie.toString();
      const movie = await this.checkMovieAvailable(movieId);

      newStart = updateDto.start_time ? new Date(updateDto.start_time) : new Date(showtime.start_time);

      // Chỉ check quá khứ nếu đổi thời gian
      if (updateDto.start_time) {
        this.checkNotInPast(newStart);
      }

      newEnd = new Date(newStart.getTime() + (movie.duration + BUFFER_MINUTES) * 60000);

      // Kiểm tra trùng lấp (loại trừ chính nó)
      await this.checkNoOverlap(roomId, newStart, newEnd, id);

      (updateDto as any).start_time = newStart;
      (updateDto as any).end_time = newEnd;
    }

    // Nếu chỉ đổi phòng (không đổi thời gian), cũng cần check overlap
    if (updateDto.room_id && !updateDto.start_time) {
      const existingStart = new Date(showtime.start_time);
      const existingEnd = new Date(showtime.end_time);
      await this.checkNoOverlap(updateDto.room_id, existingStart, existingEnd, id);
    }

    // Map các field
    const updateData: any = { ...updateDto };
    if (updateDto.movie_id) updateData.movie = updateDto.movie_id;
    if (updateDto.cinema_id) updateData.cinema = updateDto.cinema_id;
    if (updateDto.room_id) updateData.room = updateDto.room_id;

    // Xóa các field _id dư
    delete updateData.movie_id;
    delete updateData.cinema_id;
    delete updateData.room_id;

    const updated = await this.showtimeModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('movie', 'title poster_url duration')
      .populate('cinema', 'name')
      .populate('room', 'name type')
      .exec();

    if (!updated) {
      throw new NotFoundException('Không thể cập nhật suất chiếu!');
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const showtime = await this.showtimeModel.findById(id);
    if (!showtime) {
      throw new NotFoundException('Không tìm thấy suất chiếu!');
    }

    // Soft delete - chỉ set is_active = false
    await this.showtimeModel.findByIdAndUpdate(id, { is_active: false });

    return { message: 'Đã xóa suất chiếu thành công!' };
  }

  async findByCinema(cinemaId: string): Promise<Showtime[]> {
    return this.showtimeModel
      .find({ cinema: cinemaId, is_active: true })
      .populate('movie')
      .populate('room')
      .sort({ start_time: 1 })
      .exec();
  }

  async findByMovie(movieId: string): Promise<Showtime[]> {
    return this.showtimeModel
      .find({ movie: movieId, is_active: true })
      .populate('cinema')
      .populate('room')
      .sort({ start_time: 1 })
      .exec();
  }

  // Lọc suất chiếu theo rạp, ngày và phim (tuỳ chọn)
  async filterShowtimes(cinemaId: string, date?: string, movieId?: string): Promise<Showtime[]> {
    const filter: any = { cinema: cinemaId, is_active: true };

    // Lọc theo ngày
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.start_time = { $gte: startOfDay, $lte: endOfDay };
    }

    // Lọc theo phim (tuỳ chọn)
    if (movieId) {
      filter.movie = movieId;
    }

    return this.showtimeModel
      .find(filter)
      .populate('movie')
      .populate('room')
      .populate('cinema')
      .sort({ start_time: 1 })
      .exec();
  }

  // Lấy danh sách ngày có suất chiếu của rạp
  async getAvailableDates(cinemaId: string): Promise<string[]> {
    const showtimes = await this.showtimeModel
      .find({ cinema: cinemaId, is_active: true, start_time: { $gte: new Date() } })
      .select('start_time')
      .exec();

    // Chuyển đổi thành danh sách ngày unique (YYYY-MM-DD)
    const dates = showtimes.map(s => {
      const d = new Date(s.start_time);
      return d.toISOString().split('T')[0];
    });

    return [...new Set(dates)].sort();
  }

  async findOne(id: string): Promise<Showtime> {
    const showtime = await this.showtimeModel.findById(id)
      .populate('movie')
      .populate('cinema')
      .populate('room')
      .exec();

    if (!showtime) {
      throw new NotFoundException('Không tìm thấy suất chiếu này!');
    }

    return showtime;
  }
}