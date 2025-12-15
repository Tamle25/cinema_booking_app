import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cinema, CinemaSchema } from './schemas/cinema.schema';

@Module({
  imports: [
    // Đăng ký tên "Cinema" để các module khác có thể gọi được
    MongooseModule.forFeature([{ name: Cinema.name, schema: CinemaSchema }]),
  ],
})
export class CinemasModule {}