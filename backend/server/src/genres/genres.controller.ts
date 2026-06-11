import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GenresService } from './genres.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Movie } from '../movies/schemas/movie.schema';

@Controller('genres')
export class GenresController {
  constructor(
    private readonly genresService: GenresService,
    @InjectModel(Movie.name) private movieModel: Model<Movie>,
  ) {}

  @Get()
  @AdminOnly()
  findAll() {
    return this.genresService.findAll();
  }

  @Get('active')
  findAllActive() {
    return this.genresService.findAllActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.genresService.findOne(id);
  }

  @Post()
  @AdminOnly()
  create(@Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto);
  }

  @Put(':id')
  @AdminOnly()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return this.genresService.update(id, updateGenreDto);
  }

  @Patch(':id/toggle')
  @AdminOnly()
  toggleActive(@Param('id', ParseObjectIdPipe) id: string) {
    return this.genresService.toggleActive(id);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.genresService.remove(id, this.movieModel);
  }
}
