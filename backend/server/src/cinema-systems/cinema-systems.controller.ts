import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CinemaSystemsService } from './cinema-systems.service';
import { CreateCinemaSystemDto } from './dto/create-cinema-system.dto';
import { UpdateCinemaSystemDto } from './dto/update-cinema-system.dto';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cinemaSystemsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateCinemaSystemDto) {
    return this.cinemaSystemsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cinemaSystemsService.remove(id);
  }
}