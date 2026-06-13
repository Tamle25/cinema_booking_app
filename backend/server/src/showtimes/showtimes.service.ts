import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showtime } from './schemas/showtime.schema';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { MoviesService } from '../movies/movies.service';
import { CinemasService } from '../cinemas/cinemas.service';

const BUFFER_MINUTES = 15;
const EARTH_RADIUS_KM = 6371;

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    private moviesService: MoviesService,
    private cinemasService: CinemasService,
  ) {}

  private async checkMovieAvailable(movieId: string): Promise<any> {
    const movie = await this.moviesService.findOne(movieId);
    if (!movie) {
      throw new NotFoundException('Phim không tồn tại!');
    }
    if (!movie.is_active) {
      throw new BadRequestException('Phim đã ngừng chiếu!');
    }
    return movie;
  }

  private checkNotInPast(startTime: Date): void {
    const now = new Date();
    if (startTime <= now) {
      throw new BadRequestException('Không thể tạo suất chiếu trong quá khứ!');
    }
  }

  private async checkNoOverlap(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<void> {
    const filter: any = {
      room: roomId,
      is_active: true,
      $or: [{ start_time: { $lt: endTime }, end_time: { $gt: startTime } }],
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const overlapping = await this.showtimeModel.findOne(filter).exec();

    if (overlapping) {
      const existingStart = new Date(overlapping.start_time).toLocaleString(
        'vi-VN',
      );
      const existingEnd = new Date(overlapping.end_time).toLocaleString(
        'vi-VN',
      );
      throw new ConflictException(
        `Phòng đã có suất chiếu từ ${existingStart} đến ${existingEnd}!`,
      );
    }
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    cinema_id?: string;
    cinema_system_id?: string;
    movie_id?: string;
    date?: string;
  }): Promise<{
    data: Showtime[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = { is_active: true };

    if (query?.cinema_id) {
      filter.cinema = query.cinema_id;
    } else if (query?.cinema_system_id) {
      const cinemasInSystem = await this.cinemasService.findBySystem(
        query.cinema_system_id,
      );
      const cinemaIds = cinemasInSystem.map((c) => (c as any)._id);
      filter.cinema = { $in: cinemaIds };
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

  async findAllPaginated(query?: {
    page?: number;
    limit?: number;
    cinema_id?: string;
    cinema_system_id?: string;
    movie_id?: string;
    date?: string;
  }): Promise<any> {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = { is_active: true };

    if (query?.cinema_id) {
      filter.cinema = query.cinema_id;
    } else if (query?.cinema_system_id) {
      const cinemasInSystem = await this.cinemasService.findBySystem(
        query.cinema_system_id,
      );
      const cinemaIds = cinemasInSystem.map((c) => (c as any)._id);
      filter.cinema = { $in: cinemaIds };
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

    const [data, totalItems] = await Promise.all([
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

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách suất chiếu thành công',
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async create(createDto: CreateShowtimeDto): Promise<Showtime> {
    const { movie_id, cinema_id, room_id, start_time, ...rest } = createDto;

    const movie = await this.checkMovieAvailable(movie_id);

    const start = new Date(start_time);
    this.checkNotInPast(start);

    const end = new Date(
      start.getTime() + (movie.duration + BUFFER_MINUTES) * 60000,
    );

    await this.checkNoOverlap(room_id, start, end);

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
    const roomId = updateDto.room_id || showtime.room.toString();

    if (updateDto.start_time || updateDto.movie_id) {
      const movieId = updateDto.movie_id || showtime.movie.toString();
      const movie = await this.checkMovieAvailable(movieId);

      newStart = updateDto.start_time
        ? new Date(updateDto.start_time)
        : new Date(showtime.start_time);

      if (updateDto.start_time) {
        this.checkNotInPast(newStart);
      }

      newEnd = new Date(
        newStart.getTime() + (movie.duration + BUFFER_MINUTES) * 60000,
      );

      await this.checkNoOverlap(roomId, newStart, newEnd, id);

      (updateDto as any).start_time = newStart;
      (updateDto as any).end_time = newEnd;
    }

    if (updateDto.room_id && !updateDto.start_time) {
      const existingStart = new Date(showtime.start_time);
      const existingEnd = new Date(showtime.end_time);
      await this.checkNoOverlap(
        updateDto.room_id,
        existingStart,
        existingEnd,
        id,
      );
    }

    const updateData: any = { ...updateDto };
    if (updateDto.movie_id) updateData.movie = updateDto.movie_id;
    if (updateDto.cinema_id) updateData.cinema = updateDto.cinema_id;
    if (updateDto.room_id) updateData.room = updateDto.room_id;

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

  async filterShowtimes(
    cinemaId: string,
    date?: string,
    movieId?: string,
  ): Promise<Showtime[]> {
    const filter: any = { cinema: cinemaId, is_active: true };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.start_time = { $gte: startOfDay, $lte: endOfDay };
    }

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

  async getAvailableDates(cinemaId: string): Promise<string[]> {
    const showtimes = await this.showtimeModel
      .find({
        cinema: cinemaId,
        is_active: true,
        start_time: { $gte: new Date() },
      })
      .select('start_time')
      .exec();

    const dates = showtimes.map((s) => {
      const d = new Date(s.start_time);
      return d.toISOString().split('T')[0];
    });

    return [...new Set(dates)].sort();
  }

  async findOne(id: string): Promise<Showtime> {
    const showtime = await this.showtimeModel
      .findById(id)
      .populate('movie')
      .populate('cinema')
      .populate('room')
      .exec();

    if (!showtime) {
      throw new NotFoundException('Không tìm thấy suất chiếu này!');
    }

    return showtime;
  }

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateBestScore(
    price: number,
    minAllPrice: number,
    maxAllPrice: number,
    distance: number | null,
    minAllDistance: number | null,
    maxAllDistance: number | null,
    time: number,
    minAllTime: number,
    maxAllTime: number,
  ): number {
    const priceRange = maxAllPrice - minAllPrice;
    const normalizedPrice =
      priceRange > 0 ? (price - minAllPrice) / priceRange : 0;

    let normalizedDistance = 0.5;
    if (
      distance !== null &&
      minAllDistance !== null &&
      maxAllDistance !== null
    ) {
      const distRange = maxAllDistance - minAllDistance;
      normalizedDistance =
        distRange > 0 ? (distance - minAllDistance) / distRange : 0;
    }

    const timeRange = maxAllTime - minAllTime;
    const normalizedTime = timeRange > 0 ? (time - minAllTime) / timeRange : 0;

    return (
      normalizedPrice * 0.5 + normalizedDistance * 0.3 + normalizedTime * 0.2
    );
  }

  async compareByMovie(query: {
    movieId: string;
    date: string;
    userLat?: number;
    userLng?: number;
    sort?: string;
  }): Promise<any[]> {
    const { movieId, date, userLat, userLng, sort } = query;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const showtimes = await this.showtimeModel
      .find({
        movie: movieId,
        is_active: true,
        start_time: { $gte: startOfDay, $lte: endOfDay },
      })
      .populate({
        path: 'cinema',
        populate: { path: 'cinema_system' },
      })
      .populate('room', 'name type rows columns total_seats')
      .exec();

    if (!showtimes || showtimes.length === 0) {
      return [];
    }

    const cinemaMap = new Map<
      string,
      {
        cinema: any;
        showtimes: any[];
      }
    >();

    for (const st of showtimes) {
      if (!st.cinema) continue;
      const cinemaObj = st.cinema as any;
      const cinemaId = cinemaObj._id?.toString();
      if (!cinemaId) continue;

      if (!cinemaMap.has(cinemaId)) {
        cinemaMap.set(cinemaId, {
          cinema: cinemaObj,
          showtimes: [],
        });
      }
      cinemaMap.get(cinemaId)!.showtimes.push(st);
    }

    const hasUserLocation = userLat != null && userLng != null;
    const results: any[] = [];

    for (const [cinemaId, group] of cinemaMap) {
      const { cinema, showtimes: cinemaShowtimes } = group;
      const system = cinema.cinema_system;

      const prices = cinemaShowtimes
        .map((s) => s.price)
        .filter((p) => p != null && p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;

      const sortedByTime = [...cinemaShowtimes].sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
      const earliest = sortedByTime[0];
      const earliestTime = new Date(earliest.start_time);

      let totalAvailableSeats = 0;
      for (const st of cinemaShowtimes) {
        const room = st.room;
        const totalSeats = room?.total_seats || room?.rows * room?.columns || 0;
        const bookedCount = (st.booked_seats || []).length;
        totalAvailableSeats += Math.max(0, totalSeats - bookedCount);
      }

      let distanceKm: number | null = null;
      if (
        hasUserLocation &&
        cinema.latitude != null &&
        cinema.longitude != null
      ) {
        distanceKm = this.calculateHaversineDistance(
          userLat,
          userLng,
          cinema.latitude,
          cinema.longitude,
        );
      }

      const formattedShowtimes = cinemaShowtimes
        .map((st) => {
          const room = st.room;
          const totalSeats =
            room?.total_seats || room?.rows * room?.columns || 0;
          const bookedCount = (st.booked_seats || []).length;
          return {
            showtimeId: st._id,
            startTime: new Date(st.start_time).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            endTime: new Date(st.end_time).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            format: room?.type || '2D',
            roomName: room?.name || '',
            price: st.price || 0,
            availableSeats: Math.max(0, totalSeats - bookedCount),
          };
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      results.push({
        cinemaId,
        cinemaName: cinema.name,
        brand: system?.name || '',
        brandLogo: system?.logo_url || '',
        brandSlug: system?.slug || '',
        address: cinema.address || '',
        city: cinema.city || '',
        latitude: cinema.latitude,
        longitude: cinema.longitude,
        minPrice,
        distanceKm,
        earliestShowtime: earliestTime.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        earliestTimestamp: earliestTime.getTime(),
        availableSeats: totalAvailableSeats,
        labels: [] as string[],
        bestScore: 0,
        showtimes: formattedShowtimes,
      });
    }

    if (results.length === 0) return [];

    const allMinPrices = results
      .filter((r) => r.minPrice != null)
      .map((r) => r.minPrice);
    if (allMinPrices.length > 0) {
      const cheapest = Math.min(...allMinPrices);
      results
        .filter((r) => r.minPrice === cheapest)
        .forEach((r) => r.labels.push('Rẻ nhất'));
    }

    const allDistances = results
      .filter((r) => r.distanceKm != null)
      .map((r) => r.distanceKm);
    if (allDistances.length > 0) {
      const nearest = Math.min(...allDistances);
      results
        .filter((r) => r.distanceKm === nearest)
        .forEach((r) => r.labels.push('Gần nhất'));
    }

    const allEarliestTimes = results.map((r) => r.earliestTimestamp);
    const earliestOfAll = Math.min(...allEarliestTimes);
    results
      .filter((r) => r.earliestTimestamp === earliestOfAll)
      .forEach((r) => r.labels.push('Suất sớm nhất'));

    const validPrices = results
      .filter((r) => r.minPrice != null)
      .map((r) => r.minPrice);
    const minAllPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxAllPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;

    const validDistances = results
      .filter((r) => r.distanceKm != null)
      .map((r) => r.distanceKm);
    const minAllDistance =
      validDistances.length > 0 ? Math.min(...validDistances) : null;
    const maxAllDistance =
      validDistances.length > 0 ? Math.max(...validDistances) : null;

    const minAllTime = Math.min(...allEarliestTimes);
    const maxAllTime = Math.max(...allEarliestTimes);

    for (const r of results) {
      r.bestScore = this.calculateBestScore(
        r.minPrice || 0,
        minAllPrice,
        maxAllPrice,
        r.distanceKm,
        minAllDistance,
        maxAllDistance,
        r.earliestTimestamp,
        minAllTime,
        maxAllTime,
      );
    }

    const bestScoreMin = Math.min(...results.map((r) => r.bestScore));
    results
      .filter((r) => r.bestScore === bestScoreMin)
      .forEach((r) => {
        if (!r.labels.includes('Đáng chọn nhất')) {
          r.labels.push('Đáng chọn nhất');
        }
      });

    switch (sort) {
      case 'cheapest':
        results.sort(
          (a, b) => (a.minPrice || Infinity) - (b.minPrice || Infinity),
        );
        break;
      case 'nearest':
        results.sort(
          (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
        );
        break;
      case 'earliest':
        results.sort((a, b) => a.earliestTimestamp - b.earliestTimestamp);
        break;
      case 'best':
        results.sort((a, b) => a.bestScore - b.bestScore);
        break;
      case 'brand':
        results.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
      default:
        results.sort((a, b) => a.bestScore - b.bestScore);
        break;
    }

    return results.map((r) => {
      const { earliestTimestamp, bestScore, ...rest } = r;
      return rest;
    });
  }
}
