import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showtime } from './schemas/showtime.schema';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { MoviesService } from '../movies/movies.service';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    private moviesService: MoviesService,
  ) {}

  async create(createDto: CreateShowtimeDto): Promise<Showtime> {
    // 1. Tách các biến ra rõ ràng
    const { movie_id, cinema_id, room_id, start_time, ...rest } = createDto;

    // 2. Lấy thông tin phim
    const movie = await this.moviesService.findOne(movie_id);
    if (!movie) throw new NotFoundException('Phim không tồn tại');

    // 3. Tính toán giờ kết thúc
    const start = new Date(start_time);
    const end = new Date(start.getTime() + movie.duration * 60000); 

    // 4. Tạo đối tượng mới (Lưu ý phần map tên biến)
    const newShowtime = new this.showtimeModel({
      ...rest, // Các trường còn lại (price...)
      movie: movie_id,       // Map movie_id -> movie
      cinema: cinema_id,     // Map cinema_id -> cinema <--- QUAN TRỌNG
      room: room_id,         // Map room_id -> room     <--- QUAN TRỌNG
      start_time: start,
      end_time: end,
    });

    return newShowtime.save();
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