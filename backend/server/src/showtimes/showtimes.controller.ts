import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cinema_id') cinema_id?: string,
    @Query('cinema_system_id') cinema_system_id?: string,
    @Query('movie_id') movie_id?: string,
    @Query('date') date?: string,
  ) {
    return this.showtimesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      cinema_id,
      cinema_system_id,
      movie_id,
      date,
    });
  }

  @Get('admin/list')
  @AdminOnly()
  findAllPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cinema_id') cinema_id?: string,
    @Query('cinema_system_id') cinema_system_id?: string,
    @Query('movie_id') movie_id?: string,
    @Query('date') date?: string,
  ) {
    return this.showtimesService.findAllPaginated({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      cinema_id,
      cinema_system_id,
      movie_id,
      date,
    });
  }

  @Post()
  @AdminOnly()
  create(@Body() createDto: CreateShowtimeDto) {
    return this.showtimesService.create(createDto);
  }

  @Put(':id')
  @AdminOnly()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateDto: UpdateShowtimeDto,
  ) {
    return this.showtimesService.update(id, updateDto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.showtimesService.remove(id);
  }

  @Get('cinema/:cinemaId')
  findByCinema(@Param('cinemaId', ParseObjectIdPipe) cinemaId: string) {
    return this.showtimesService.findByCinema(cinemaId);
  }

  @Get('movie/:movieId')
  findByMovie(@Param('movieId', ParseObjectIdPipe) movieId: string) {
    return this.showtimesService.findByMovie(movieId);
  }

  @Get('filter')
  filterShowtimes(
    @Query('cinemaId') cinemaId: string,
    @Query('date') date?: string,
    @Query('movieId') movieId?: string,
  ) {
    return this.showtimesService.filterShowtimes(cinemaId, date, movieId);
  }

  @Get('dates/:cinemaId')
  getAvailableDates(@Param('cinemaId', ParseObjectIdPipe) cinemaId: string) {
    return this.showtimesService.getAvailableDates(cinemaId);
  }

  @Get('compare')
  compareShowtimes(
    @Query('movieId') movieId: string,
    @Query('date') date: string,
    @Query('userLat') userLat?: string,
    @Query('userLng') userLng?: string,
    @Query('sort') sort?: string,
  ) {
    return this.showtimesService.compareByMovie({
      movieId,
      date,
      userLat: userLat ? parseFloat(userLat) : undefined,
      userLng: userLng ? parseFloat(userLng) : undefined,
      sort,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.showtimesService.findOne(id);
  }
}
