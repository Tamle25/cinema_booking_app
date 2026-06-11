import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

const comboStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'combos'),
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `combo-${uniqueSuffix}${ext}`);
  },
});

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  findActive(
    @Query('cinemaSystemId') cinemaSystemId?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.combosService.findActive(cinemaSystemId, cinemaId);
  }

  @Get('all')
  @AdminOnly()
  findAll(@Query('cinemaSystemId') cinemaSystemId?: string) {
    return this.combosService.findAll(cinemaSystemId);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.combosService.findOne(id);
  }

  @Post()
  @AdminOnly()
  create(@Body() createComboDto: CreateComboDto) {
    return this.combosService.create(createComboDto);
  }

  @Post('upload')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: comboStorage,
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Chỉ chấp nhận file ảnh!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'Không có file nào được upload' };
    }
    const imageUrl = `/uploads/combos/${file.filename}`;
    return { image_url: imageUrl };
  }

  @Put(':id')
  @AdminOnly()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateComboDto: UpdateComboDto,
  ) {
    return this.combosService.update(id, updateComboDto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.combosService.remove(id);
  }
}
