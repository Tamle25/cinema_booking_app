import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

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

  @Get('admin/list')
  findAllPaginated(@Query() query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    return this.cinemasService.findAllPaginated(page, limit);
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

  // API lấy chi tiết 1 rạp
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cinemasService.findOne(id);
  }

  // API cập nhật thông tin rạp
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateCinemaDto) {
    return this.cinemasService.update(id, updateDto);
  }

  // API xóa rạp
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.cinemasService.delete(id);
  }
}