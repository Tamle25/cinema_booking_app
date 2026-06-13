import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import {
  hasValidImageSignature,
  ImageUploadInterceptor,
} from '../common/upload/image-upload.interceptor';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsService } from './news.service';

const MAX_NEWS_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
type AuthenticatedRequest = {
  user: {
    _id?: string;
    id?: string;
  };
};

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  findPublished() {
    return this.newsService.findPublished();
  }

  @Get('slug/:slug')
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.newsService.findPublishedBySlug(slug);
  }

  @Get('admin/all')
  @AdminOnly()
  findAllAdmin() {
    return this.newsService.findAllAdmin();
  }

  @Get('admin/:id')
  @AdminOnly()
  findOneAdmin(@Param('id', ParseObjectIdPipe) id: string) {
    return this.newsService.findOneAdmin(id);
  }

  @Post()
  @AdminOnly()
  create(@Body() createNewsDto: CreateNewsDto) {
    return this.newsService.create(createNewsDto);
  }

  @Post('upload')
  @AdminOnly()
  @UseInterceptors(ImageUploadInterceptor('image', MAX_NEWS_IMAGE_SIZE_BYTES))
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Khong co file duoc upload');
    }

    if (!hasValidImageSignature(file)) {
      throw new BadRequestException('File khong dung dinh dang anh hop le');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file,
      'cinemax/news',
    );

    return {
      thumbnail: uploaded.secure_url,
      thumbnail_public_id: uploaded.public_id,
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  }

  @Put(':id')
  @AdminOnly()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateNewsDto: UpdateNewsDto,
  ) {
    return this.newsService.update(id, updateNewsDto);
  }

  @Patch(':id/publish')
  @AdminOnly()
  updatePublishStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.newsService.updatePublishStatus(id, isPublished);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.newsService.remove(id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  toggleLike(
    @Param('id', ParseObjectIdPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      throw new BadRequestException('Khong tim thay user id trong token');
    }
    return this.newsService.toggleLike(id, userId);
  }
}
