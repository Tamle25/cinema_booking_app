import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CinemaSystemsController } from './cinema-systems.controller';
import { CinemaSystemsService } from './cinema-systems.service';
import { CinemaSystem, CinemaSystemSchema } from './schemas/cinema-system.schema';

@Module({
  imports: [
    // Đăng ký Schema để Service có thể dùng được (InjectModel)
    MongooseModule.forFeature([
      { name: CinemaSystem.name, schema: CinemaSystemSchema },
    ]),
  ],
  controllers: [CinemaSystemsController],
  providers: [CinemaSystemsService],
  exports: [CinemaSystemsService], // Export nếu sau này module khác cần dùng
})
export class CinemaSystemsModule {}