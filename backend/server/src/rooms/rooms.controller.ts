import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @AdminOnly()
  create(@Body() createDto: CreateRoomDto) {
    return this.roomsService.create(createDto);
  }

  @Get('admin/list')
  @AdminOnly()
  findAllPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cinema_id') cinema_id?: string,
  ) {
    return this.roomsService.findAllPaginated({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      cinema_id,
    });
  }

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @Get('cinema/:cinemaId')
  findByCinema(@Param('cinemaId', ParseObjectIdPipe) cinemaId: string) {
    return this.roomsService.findByCinema(cinemaId);
  }

  @Get('cinema/:cinemaId/active')
  findByCinemaActive(@Param('cinemaId', ParseObjectIdPipe) cinemaId: string) {
    return this.roomsService.findByCinemaActive(cinemaId);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.roomsService.findOne(id);
  }

  @Put(':id')
  @AdminOnly()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateDto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.roomsService.remove(id);
  }
}
