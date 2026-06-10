import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';
import { Showtime, ShowtimeSchema } from './schemas/showtime.schema';
import { MoviesModule } from '../movies/movies.module';
import { CinemasModule } from '../cinemas/cinemas.module';

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
