import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cinema, CinemaSchema } from './schemas/cinema.schema';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';

@Module({
  imports: [
    // Đăng ký tên "Cinema" để các module khác có thể gọi được
    MongooseModule.forFeature([{ name: Cinema.name, schema: CinemaSchema }]),
  ],
  controllers: [CinemasController],
  providers: [CinemasService],
  exports: [CinemasService]
})
export class CinemasModule {}