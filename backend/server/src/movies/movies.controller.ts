import { Controller, Get, Param } from '@nestjs/common'; 
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  async getAllMovies() {
    return this.moviesService.findAll();
  }

  @Get(':id') 
  async getMovie(@Param('id') id: string) {
    return this.moviesService.findOne(id);
  }
  
}