import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';
import { Showtime, ShowtimeSchema } from './schemas/showtime.schema';
import { MoviesModule } from '../movies/movies.module'; // Import để dùng MoviesService
import { CinemasModule } from '../cinemas/cinemas.module'; // Import để populate cinema + cinema_system

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Showtime.name, schema: ShowtimeSchema }]),
    MoviesModule,
    CinemasModule,
  ],
  controllers: [ShowtimesController],
  providers: [ShowtimesService],
  exports: [ShowtimesService]
})
export class ShowtimesModule {}