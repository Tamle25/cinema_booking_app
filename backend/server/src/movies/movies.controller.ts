import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @AdminOnly()
  create(@Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.create(createMovieDto);
  }

  @Get()
  findAll(@Query('genre') genreId?: string) {
    return this.moviesService.findAll(genreId);
  }

  @Get('admin/list')
  @AdminOnly()
  findAllPaginated(@Query() query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    return this.moviesService.findAllPaginated(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.moviesService.findOne(id);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.moviesService.remove(id);
  }

  @Put(':id')
  @AdminOnly()
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() updateMovieDto: UpdateMovieDto) {
    return this.moviesService.update(id, updateMovieDto);
  }
}
