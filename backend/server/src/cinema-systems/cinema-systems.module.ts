import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CinemaSystemsController } from './cinema-systems.controller';
import { CinemaSystemsService } from './cinema-systems.service';
import { CinemaSystem, CinemaSystemSchema } from './schemas/cinema-system.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CinemaSystem.name, schema: CinemaSystemSchema },
    ]),
  ],
  controllers: [CinemaSystemsController],
  providers: [CinemaSystemsService],
  exports: [CinemaSystemsService],
})
export class CinemaSystemsModule {}
