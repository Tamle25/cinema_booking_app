import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Post()
  create(@Body() createDto: CreateShowtimeDto) {
    return this.showtimesService.create(createDto);
  }

  @Get('cinema/:cinemaId')
  findByCinema(@Param('cinemaId') cinemaId: string) {
    return this.showtimesService.findByCinema(cinemaId);
  }

  @Get('movie/:movieId')
  findByMovie(@Param('movieId') movieId: string) {
    return this.showtimesService.findByMovie(movieId);
  }

  // API lọc suất chiếu theo rạp và ngày
  @Get('filter')
  filterShowtimes(
    @Query('cinemaId') cinemaId: string,
    @Query('date') date?: string, // Format: YYYY-MM-DD
    @Query('movieId') movieId?: string,
  ) {
    return this.showtimesService.filterShowtimes(cinemaId, date, movieId);
  }

  // Lấy danh sách ngày có suất chiếu của rạp
  @Get('dates/:cinemaId')
  getAvailableDates(@Param('cinemaId') cinemaId: string) {
    return this.showtimesService.getAvailableDates(cinemaId);
  }
  
  @Get(':id')
  findOne(@Param('id') id: string) {
      return this.showtimesService.findOne(id);
  }
}