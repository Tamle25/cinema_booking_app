import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { Genre, GenreSchema } from './schemas/genre.schema';
import { Movie, MovieSchema } from '../movies/schemas/movie.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Genre.name, schema: GenreSchema },
      { name: Movie.name, schema: MovieSchema },
    ]),
  ],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
