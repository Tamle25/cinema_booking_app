import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.constants';

type CloudinaryInstance = typeof cloudinary;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinaryClient: CloudinaryInstance,
    private readonly configService: ConfigService,
  ) {}

  private ensureConfigured() {
    const requiredVariables = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ];
    const missingVariables = requiredVariables.filter(
      (name) => !this.configService.get<string>(name),
    );

    if (missingVariables.length > 0) {
      this.logger.error(
        `Cloudinary chua duoc cau hinh day du. Thieu bien moi truong: ${missingVariables.join(', ')}`,
      );
      throw new InternalServerErrorException(
        `Cloudinary chua duoc cau hinh day du. Thieu bien moi truong: ${missingVariables.join(', ')}`,
      );
    }

    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (
      apiSecret &&
      (apiSecret.includes('<INSERT') ||
        apiSecret === 'your_cloudinary_api_secret_here')
    ) {
      this.logger.error(
        'CLOUDINARY_API_SECRET la gia tri placeholder! Vui long cap nhat .env voi API Secret that.',
      );
      throw new InternalServerErrorException(
        'CLOUDINARY_API_SECRET chua duoc cau hinh dung. Vui long kiem tra file .env.',
      );
    }
  }

  uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    this.ensureConfigured();

    this.logger.log(
      `Bat dau upload anh: originalname=${file.originalname}, mimetype=${file.mimetype}, size=${file.size} bytes, folder=${folder}`,
    );

    if (!file.buffer || file.buffer.length === 0) {
      this.logger.error(
        `File buffer rong hoac khong ton tai: originalname=${file.originalname}`,
      );
      throw new InternalServerErrorException(
        'File buffer rong, khong the upload len Cloudinary',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          overwrite: false,
          unique_filename: true,
          use_filename: false,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('=== CLOUDINARY UPLOAD ERROR ===');
            this.logger.error(
              `File info: originalname=${file.originalname}, mimetype=${file.mimetype}, size=${file.size}`,
            );
            if (error) {
              this.logger.error(`error.message: ${error.message}`);
              this.logger.error(`error.name: ${(error as any).name || 'N/A'}`);
              this.logger.error(
                `error.http_code: ${(error as any).http_code || 'N/A'}`,
              );
              this.logger.error(`Full error: ${JSON.stringify(error)}`);
            } else {
              this.logger.error(
                'Cloudinary tra ve result undefined/null ma khong co error',
              );
            }
            this.logger.error('=== END CLOUDINARY UPLOAD ERROR ===');

            reject(error ?? new Error('Cloudinary upload failed: no result'));
            return;
          }

          this.logger.log(
            `Upload thanh cong: public_id=${result.public_id}, url=${result.secure_url}, ${result.width}x${result.height}, ${result.format}, ${result.bytes} bytes`,
          );
          resolve(result);
        },
      );

      uploadStream.on('error', (streamError) => {
        this.logger.error(`Upload stream error: ${streamError.message}`);
        reject(streamError);
      });

      uploadStream.end(file.buffer);
    });
  }

  async destroyImage(publicId?: string): Promise<void> {
    if (!publicId) return;

    try {
      this.ensureConfigured();
      await this.cloudinaryClient.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
      this.logger.log(`Da xoa anh Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.warn(
        `Khong the xoa anh Cloudinary ${publicId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
