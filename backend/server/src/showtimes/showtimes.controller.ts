import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) { }

  // Lấy tất cả suất chiếu (có phân trang và filter)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cinema_id') cinema_id?: string,
    @Query('movie_id') movie_id?: string,
    @Query('date') date?: string,
  ) {
    return this.showtimesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      cinema_id,
      movie_id,
      date,
    });
  }

  @Get('admin/list')
  findAllPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cinema_id') cinema_id?: string,
    @Query('movie_id') movie_id?: string,
    @Query('date') date?: string,
  ) {
    return this.showtimesService.findAllPaginated({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      cinema_id,
      movie_id,
      date,
    });
  }

  @Post()
  create(@Body() createDto: CreateShowtimeDto) {
    return this.showtimesService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateShowtimeDto) {
    return this.showtimesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.showtimesService.remove(id);
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
