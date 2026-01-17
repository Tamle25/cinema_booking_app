import { Controller, Get, Post, Body } from '@nestjs/common';
import { CinemaSystemsService } from './cinema-systems.service';
import { CreateCinemaSystemDto } from './dto/create-cinema-system.dto';

@Controller('cinema-systems')
export class CinemaSystemsController {
  constructor(private readonly cinemaSystemsService: CinemaSystemsService) {}

  @Post()
  create(@Body() createDto: CreateCinemaSystemDto) {
    return this.cinemaSystemsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.cinemaSystemsService.findAll();
  }
}