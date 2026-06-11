import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CinemaSystemsService } from './cinema-systems.service';
import { CreateCinemaSystemDto } from './dto/create-cinema-system.dto';
import { UpdateCinemaSystemDto } from './dto/update-cinema-system.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('cinema-systems')
export class CinemaSystemsController {
  constructor(private readonly cinemaSystemsService: CinemaSystemsService) {}

  @Post()
  @AdminOnly()
  create(@Body() createDto: CreateCinemaSystemDto) {
    return this.cinemaSystemsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.cinemaSystemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.cinemaSystemsService.findOne(id);
  }

  @Put(':id')
  @AdminOnly()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateDto: UpdateCinemaSystemDto,
  ) {
    return this.cinemaSystemsService.update(id, updateDto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.cinemaSystemsService.remove(id);
  }
}
