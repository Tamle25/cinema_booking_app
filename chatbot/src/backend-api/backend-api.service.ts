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

  private async get(path: string, token?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = token;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}${path}`, {
          headers,
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Backend API error [${path}]: ${error.message}`);

      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        return null;
      }

      return null;
    }
  }

  // ============================================================
  // Movies
  // ============================================================

  async getAllMovies(): Promise<any> {
    return this.get('/movies');
  }

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

  async getMovieById(id: string): Promise<any> {
    return this.get(`/movies/${id}`);
  }

  async searchMovieByName(keyword: string): Promise<any> {
    const movies = await this.get('/movies');
    if (!movies || !Array.isArray(movies)) return null;

    const normalizedKeyword = this.normalizeVietnamese(keyword);

    // Exact match first
    const exact = movies.find((movie: any) =>
      this.normalizeVietnamese(movie.title || '') === normalizedKeyword,
    );
    if (exact) return exact;

    // Partial match
    const partial = movies.find((movie: any) =>
      this.normalizeVietnamese(movie.title || '').includes(normalizedKeyword) ||
      normalizedKeyword.includes(this.normalizeVietnamese(movie.title || '')),
    );

    return partial || null;
  }

  // ============================================================
  // Showtimes
  // ============================================================

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

  async getShowtimesByMovie(movieId: string): Promise<any> {
    return this.get(`/showtimes/movie/${movieId}`);
  }

  async getShowtimeById(id: string): Promise<any> {
    return this.get(`/showtimes/${id}`);
  }

  async filterShowtimes(cinemaId: string, date?: string, movieId?: string): Promise<any> {
    let path = `/showtimes/filter?cinemaId=${cinemaId}`;
    if (date) path += `&date=${date}`;
    if (movieId) path += `&movieId=${movieId}`;

    return this.get(path);
  }

  // ============================================================
  // Cinemas
  // ============================================================

  async getAllCinemas(): Promise<any> {
    return this.get('/cinemas');
  }

  async getCinemaById(id: string): Promise<any> {
    return this.get(`/cinemas/${id}`);
  }

  async getCinemaCities(): Promise<any> {
    return this.get('/cinemas/cities');
  }

  // ============================================================
  // Combos
  // ============================================================

  async getActiveCombos(): Promise<any> {
    return this.get('/combos');
  }

  // ============================================================
  // News
  // ============================================================

  async getPublishedNews(): Promise<any> {
    return this.get('/news');
  }

  // ============================================================
  // Bookings
  // ============================================================

  async getMyBookings(authToken: string): Promise<any> {
    return this.get('/bookings/my-bookings', authToken);
  }

  // ============================================================
  // Vouchers / Promotions
  // ============================================================

  async getActivePromotions(): Promise<any> {
    return this.get('/vouchers/active-promotions');
  }

  async getExchangeableVouchers(): Promise<any> {
    return this.get('/vouchers/exchangeable');
  }

  // ============================================================
  // Helpers
  // ============================================================

  private normalizeVietnamese(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }
}
