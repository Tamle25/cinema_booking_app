import {
  BadRequestException,
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
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import {
  hasValidImageSignature,
  ImageUploadInterceptor,
} from '../common/upload/image-upload.interceptor';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

const MAX_COMBO_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('combos')
export class CombosController {
  constructor(
    private readonly combosService: CombosService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
  @UseInterceptors(ImageUploadInterceptor('image', MAX_COMBO_IMAGE_SIZE_BYTES))
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Khong co file duoc upload');
    }

    if (!hasValidImageSignature(file)) {
      throw new BadRequestException('File khong dung dinh dang anh hop le');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file,
      'cinemax/combos',
    );

    return {
      image_url: uploaded.secure_url,
      image_public_id: uploaded.public_id,
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
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
