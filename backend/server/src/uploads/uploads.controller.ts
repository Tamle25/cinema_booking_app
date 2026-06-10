import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadApiResponse } from 'cloudinary';
import { memoryStorage } from 'multer';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

type MovieImageType = 'poster' | 'banner';

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MOVIE_IMAGE_RULES: Record<
  MovieImageType,
  {
    folder: string;
    minWidth: number;
    minHeight: number;
    minRatio: number;
    maxRatio: number;
    targetLabel: string;
  }
> = {
  poster: {
    folder: 'cinemax/movies/posters',
    minWidth: 600,
    minHeight: 900,
    minRatio: 0.58,
    maxRatio: 0.75,
    targetLabel: 'poster 2:3',
  },
  banner: {
    folder: 'cinemax/movies/banners',
    minWidth: 1280,
    minHeight: 480,
    minRatio: 1.6,
    maxRatio: 3.4,
    targetLabel: 'banner ngang cua hero',
  },
};

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('movie-image')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              `Dinh dang file khong hop le: ${file.mimetype}. Chi chap nhan: image/jpeg, image/png, image/webp`,
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadMovieImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('type') type: MovieImageType,
  ) {
    if (!file) {
      this.logger.warn(
        'Upload request khong co file. Kiem tra frontend gui dung field name "file".',
      );
      throw new BadRequestException(
        'Khong tim thay file upload. Dam bao gui file voi field name la "file".',
      );
    }

    this.logger.log(
      `Nhan file upload: originalname=${file.originalname}, mimetype=${file.mimetype}, size=${file.size}, bufferLength=${file.buffer?.length ?? 0}`,
    );

    if (type !== 'poster' && type !== 'banner') {
      throw new BadRequestException(
        `type khong hop le: "${type}". Chi chap nhan "poster" hoac "banner".`,
      );
    }

    if (!this.hasValidImageSignature(file)) {
      this.logger.warn(
        `File ${file.originalname} co mimetype ${file.mimetype} nhung magic bytes khong khop.`,
      );
      throw new BadRequestException(
        'File khong dung dinh dang anh hop le. Noi dung file khong khop voi dinh dang khai bao.',
      );
    }

    let uploaded: UploadApiResponse;
    try {
      uploaded = await this.cloudinaryService.uploadImage(
        file,
        MOVIE_IMAGE_RULES[type].folder,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const httpCode = (error as any)?.http_code;
      const errorName = (error as any)?.name;

      this.logger.error('=== UPLOAD MOVIE IMAGE FAILED ===');
      this.logger.error(`error.message: ${errorMessage}`);
      this.logger.error(`error.name: ${errorName || 'N/A'}`);
      this.logger.error(`error.http_code: ${httpCode || 'N/A'}`);
      this.logger.error(
        `File: originalname=${file.originalname}, mimetype=${file.mimetype}, size=${file.size}`,
      );
      this.logger.error('=== END UPLOAD MOVIE IMAGE FAILED ===');

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      const isDev = process.env.NODE_ENV !== 'production';
      throw new InternalServerErrorException(
        isDev
          ? `Upload anh len Cloudinary that bai: ${errorMessage}${httpCode ? ` (HTTP ${httpCode})` : ''}`
          : 'Upload anh len Cloudinary that bai. Vui long thu lai.',
      );
    }

    const validation = this.validateUploadedImage(type, uploaded);
    if (validation.errors.length > 0) {
      await this.cloudinaryService.destroyImage(uploaded.public_id);
      throw new BadRequestException(validation.errors);
    }

    return {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      warnings: validation.warnings,
    };
  }

  private hasValidImageSignature(file: Express.Multer.File): boolean {
    const buffer = file.buffer;
    if (!buffer || buffer.length < 12) return false;

    if (file.mimetype === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (file.mimetype === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }

    if (file.mimetype === 'image/webp') {
      return (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }

    return false;
  }

  private validateUploadedImage(
    type: MovieImageType,
    uploaded: UploadApiResponse,
  ) {
    const rules = MOVIE_IMAGE_RULES[type];
    const errors: string[] = [];
    const warnings: string[] = [];
    const width = uploaded.width ?? 0;
    const height = uploaded.height ?? 0;
    const ratio = height > 0 ? width / height : 0;

    if (width < rules.minWidth || height < rules.minHeight) {
      errors.push(
        `${type === 'poster' ? 'Poster' : 'Banner'} qua nho (${width}x${height}). Toi thieu ${rules.minWidth}x${rules.minHeight}px de tranh bi nhoe khi hien thi.`,
      );
    }

    if (ratio < rules.minRatio || ratio > rules.maxRatio) {
      warnings.push(
        `Ty le anh ${width}x${height} khac nhieu so voi layout ${rules.targetLabel}; anh co the bi crop xau khi hien thi.`,
      );
    }

    return { errors, warnings };
  }
}
