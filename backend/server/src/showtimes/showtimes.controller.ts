import { Controller, Get, Param } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Get('movie/:movieId')
  async getShowtimesByMovie(@Param('movieId') movieId: string) {
    return this.showtimesService.findByMovie(movieId);
  }
  @Get(':id')
  async getShowtime(@Param('id') id: string) {
    return this.showtimesService.findOne(id);
  }
}