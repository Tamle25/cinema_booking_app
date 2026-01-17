import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms') // API: http://localhost:4000/rooms
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createDto: CreateRoomDto) {
    return this.roomsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  // API lấy phòng theo Rạp (Quan trọng cho trang Admin)
  @Get('cinema/:cinemaId')
  findByCinema(@Param('cinemaId') cinemaId: string) {
    return this.roomsService.findByCinema(cinemaId);
  }
}