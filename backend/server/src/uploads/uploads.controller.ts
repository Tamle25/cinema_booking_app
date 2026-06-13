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
import { UploadApiResponse } from 'cloudinary';
import { AdminOnly } from '../common/decorators/admin.decorator';
import {
  hasValidImageSignature,
  ImageUploadInterceptor,
} from '../common/upload/image-upload.interceptor';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

type MovieImageType = 'poster' | 'banner';
type UploadFailure = Error & {
  http_code?: number;
};

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const POSTER_EXPECTED_RATIO = 2 / 3; // ~0.6667
const POSTER_RATIO_TOLERANCE = 0.135; // ~20% sai số (cho phép tỉ lệ từ ~0.531 đến ~0.801)

const BANNER_EXPECTED_RATIO = 16 / 6; // 8 / 3 hay ~2.6667
const BANNER_RATIO_TOLERANCE = 0.533; // ~20% sai số (cho phép tỉ lệ từ ~2.133 đến ~3.200)

const MOVIE_IMAGE_RULES: Record<
  MovieImageType,
  {
    folder: string;
    minWidth: number;
    minHeight: number;
    expectedRatio: number;
    tolerance: number;
    targetLabel: string;
  }
> = {
  poster: {
    folder: 'cinemax/movies/posters',
    minWidth: 500,
    minHeight: 750,
    expectedRatio: POSTER_EXPECTED_RATIO,
    tolerance: POSTER_RATIO_TOLERANCE,
    targetLabel: '2:3',
  },
  banner: {
    folder: 'cinemax/movies/banners',
    minWidth: 800,
    minHeight: 300,
    expectedRatio: BANNER_EXPECTED_RATIO,
    tolerance: BANNER_RATIO_TOLERANCE,
    targetLabel: '16:6',
  },
};

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('movie-image')
  @AdminOnly()
  @UseInterceptors(ImageUploadInterceptor('file', MAX_IMAGE_SIZE_BYTES))
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
        `type khong hop le: "${String(type)}". Chi chap nhan "poster" hoac "banner".`,
      );
    }

    if (!hasValidImageSignature(file)) {
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
    } catch (error: unknown) {
      const uploadError = error as UploadFailure;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const httpCode = uploadError.http_code;
      const errorName = uploadError.name;

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
        `${type === 'poster' ? 'Poster' : 'Banner'} quá nhỏ (${width}x${height}). Tối thiểu ${rules.minWidth}x${rules.minHeight}px để tránh bị nhòe khi hiển thị.`,
      );
    }

    const diff = Math.abs(ratio - rules.expectedRatio);
    if (diff > rules.tolerance) {
      errors.push(
        `Ảnh có tỷ lệ quá khác so với tỷ lệ khuyến nghị. Vui lòng chọn ảnh gần với tỷ lệ ${rules.targetLabel}.`,
      );
    }

    return { errors, warnings };
  }
}
