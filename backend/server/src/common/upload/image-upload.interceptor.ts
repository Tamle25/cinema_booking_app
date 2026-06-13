import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function ImageUploadInterceptor(
  fieldName: string,
  maxSizeBytes: number,
) {
  return FileInterceptor(fieldName, {
    storage: memoryStorage(),
    limits: { fileSize: maxSizeBytes },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        callback(
          new BadRequestException(
            `Dinh dang file khong hop le: ${file.mimetype}. Chi chap nhan jpg, jpeg, png, webp.`,
          ),
          false,
        );
        return;
      }

      callback(null, true);
    },
  });
}

export function hasValidImageSignature(file: Express.Multer.File): boolean {
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
