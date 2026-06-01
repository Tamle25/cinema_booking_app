import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.constants';

const logger = new Logger('CloudinaryProvider');

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      logger.error(
        `Cloudinary CHUA duoc cau hinh! Thieu: ${[
          !cloudName && 'CLOUDINARY_CLOUD_NAME',
          !apiKey && 'CLOUDINARY_API_KEY',
          !apiSecret && 'CLOUDINARY_API_SECRET',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
      logger.warn(
        'Upload anh se THAT BAI cho den khi cau hinh Cloudinary dung trong file .env',
      );
    } else {
      // Kiểm tra placeholder values
      if (
        apiSecret.includes('<INSERT') ||
        apiSecret === 'your_cloudinary_api_secret_here'
      ) {
        logger.error(
          'CLOUDINARY_API_SECRET la gia tri placeholder! Vui long cap nhat .env voi API Secret that tu Cloudinary dashboard.',
        );
      } else {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });
        logger.log(
          `Cloudinary da duoc cau hinh: cloud_name=${cloudName}, api_key=${apiKey.substring(0, 6)}***`,
        );
      }
    }

    return cloudinary;
  },
};
