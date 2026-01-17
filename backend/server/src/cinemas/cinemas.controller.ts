import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Post()
  create(@Body() createDto: CreateCinemaDto) {
    return this.cinemasService.create(createDto);
  }

  @Get()
  findAll() {
    return this.cinemasService.findAll();
  }

  // API lấy danh sách khu vực (thành phố) có rạp chiếu
  @Get('cities')
  getCities() {
    return this.cinemasService.getCities();
  }

  // API lấy danh sách rạp theo ID hệ thống (Dùng khi user click vào Logo Beta)
  @Get('system/:systemId')
  findBySystem(@Param('systemId') systemId: string) {
    return this.cinemasService.findBySystem(systemId);
  }

  // API lọc rạp theo hệ thống và/hoặc khu vực
  @Get('filter')
  filterCinemas(
    @Query('systemId') systemId?: string,
    @Query('city') city?: string,
  ) {
    return this.cinemasService.filterCinemas(systemId, city);
  }
}