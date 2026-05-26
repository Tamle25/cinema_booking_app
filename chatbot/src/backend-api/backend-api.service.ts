import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BackendApiService {
  private readonly logger = new Logger(BackendApiService.name);
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('BACKEND_BASE_URL') || 'http://localhost:4000';
  }

  /**
   * Helper: gọi GET request tới backend
   */
  private async get(path: string, token?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = token;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}${path}`, {
          headers,
          timeout: 10000, // 10 giây timeout
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Backend API error [${path}]: ${error.message}`);

      if (error.response) {
        // Backend trả về lỗi
        this.logger.error(`Status: ${error.response.status}`);
        return null;
      }

      // Backend không phản hồi
      return null;
    }
  }

  // ============ MOVIES ============

  /** Lấy tất cả phim */
  async getAllMovies(): Promise<any> {
    return this.get('/movies');
  }

  /** Lấy phim đang chiếu (filter từ tất cả phim) */
  async getNowShowingMovies(): Promise<any> {
    const movies = await this.get('/movies');
    if (!movies || !Array.isArray(movies)) return [];

    const now = new Date();
    return movies.filter((movie: any) => {
      if (!movie.release_date) return false;
      const releaseDate = new Date(movie.release_date);
      return releaseDate <= now && movie.is_active !== false;
    });
  }

  /** Lấy phim sắp chiếu (filter từ tất cả phim) */
  async getUpcomingMovies(): Promise<any> {
    const movies = await this.get('/movies');
    if (!movies || !Array.isArray(movies)) return [];

    const now = new Date();
    return movies.filter((movie: any) => {
      if (!movie.release_date) return true;
      const releaseDate = new Date(movie.release_date);
      return releaseDate > now;
    });
  }

  /** Lấy chi tiết phim theo ID */
  async getMovieById(id: string): Promise<any> {
    return this.get(`/movies/${id}`);
  }

  /** Tìm phim theo keyword trong tên */
  async searchMovieByName(keyword: string): Promise<any> {
    const movies = await this.get('/movies');
    if (!movies || !Array.isArray(movies)) return null;

    const normalizedKeyword = keyword.toLowerCase().trim();

    // Tìm phim match tên
    const found = movies.find((movie: any) =>
      movie.title?.toLowerCase().includes(normalizedKeyword),
    );

    return found || null;
  }

  // ============ SHOWTIMES ============

  /** Lấy suất chiếu (có filter) */
  async getShowtimes(params?: {
    cinemaId?: string;
    movieId?: string;
    date?: string;
  }): Promise<any> {
    let path = '/showtimes?limit=50';
    if (params?.cinemaId) path += `&cinema_id=${params.cinemaId}`;
    if (params?.movieId) path += `&movie_id=${params.movieId}`;
    if (params?.date) path += `&date=${params.date}`;

    return this.get(path);
  }

  /** Lấy suất chiếu theo phim */
  async getShowtimesByMovie(movieId: string): Promise<any> {
    return this.get(`/showtimes/movie/${movieId}`);
  }

  /** Lấy suất chiếu chi tiết (bao gồm booked_seats) */
  async getShowtimeById(id: string): Promise<any> {
    return this.get(`/showtimes/${id}`);
  }

  /** Lọc suất chiếu theo rạp và ngày */
  async filterShowtimes(cinemaId: string, date?: string, movieId?: string): Promise<any> {
    let path = `/showtimes/filter?cinemaId=${cinemaId}`;
    if (date) path += `&date=${date}`;
    if (movieId) path += `&movieId=${movieId}`;

    return this.get(path);
  }

  // ============ CINEMAS ============

  /** Lấy tất cả rạp */
  async getAllCinemas(): Promise<any> {
    return this.get('/cinemas');
  }

  /** Lấy chi tiết rạp */
  async getCinemaById(id: string): Promise<any> {
    return this.get(`/cinemas/${id}`);
  }

  /** Lấy danh sách thành phố */
  async getCinemaCities(): Promise<any> {
    return this.get('/cinemas/cities');
  }

  // ============ COMBOS ============

  /** Lấy combo active */
  async getActiveCombos(): Promise<any> {
    return this.get('/combos');
  }

  // ============ NEWS ============

  /** Lấy tin tức đã published */
  async getPublishedNews(): Promise<any> {
    return this.get('/news');
  }

  // ============ BOOKINGS (cần auth) ============

  /** Lấy vé đã đặt của user — cần Authorization header */
  async getMyBookings(authToken: string): Promise<any> {
    return this.get('/bookings/my-bookings', authToken);
  }
}
