import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsService } from './news.service';

const newsStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'news'),
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `news-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

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
  @UseInterceptors(
    FileInterceptor('image', {
      storage: newsStorage,
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Chỉ chấp nhận file ảnh'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'Không có file được upload' };
    }

    return { thumbnail: `/uploads/news/${file.filename}` };
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
  toggleLike(@Param('id', ParseObjectIdPipe) id: string, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.newsService.toggleLike(id, userId);
  }
}
