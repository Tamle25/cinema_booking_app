import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Post()
  @AdminOnly()
  create(@Body() createDto: CreateCinemaDto) {
    return this.cinemasService.create(createDto);
  }

  @Get()
  findAll() {
    return this.cinemasService.findAll();
  }

  @Get('admin/list')
  @AdminOnly()
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
  findBySystem(@Param('systemId', ParseObjectIdPipe) systemId: string) {
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
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.cinemasService.findOne(id);
  }

  // API cập nhật thông tin rạp
  @Put(':id')
  @AdminOnly()
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() updateDto: UpdateCinemaDto) {
    return this.cinemasService.update(id, updateDto);
  }

  // API xóa rạp
  @Delete(':id')
  @AdminOnly()
  delete(@Param('id', ParseObjectIdPipe) id: string) {
    return this.cinemasService.delete(id);
  }
}
