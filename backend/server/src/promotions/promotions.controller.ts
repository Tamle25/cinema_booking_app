import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // GET /promotions — Lấy promotions active (cho user/homepage)
  @Get()
  findActive() {
    return this.promotionsService.findActive();
  }

  // GET /promotions/all — Lấy tất cả (cho admin)
  @Get('all')
  findAll() {
    return this.promotionsService.findAll();
  }

  // GET /promotions/:id — Chi tiết
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  // POST /promotions — Tạo mới
  @Post()
  create(@Body() createDto: CreatePromotionDto) {
    return this.promotionsService.create(createDto);
  }

  // PUT /promotions/:id — Cập nhật
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePromotionDto) {
    return this.promotionsService.update(id, updateDto);
  }

  // DELETE /promotions/:id — Xóa
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
