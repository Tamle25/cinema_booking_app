import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MomoService } from './momo.service';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Showtime, ShowtimeSchema } from '../showtimes/schemas/showtime.schema';
import { CombosModule } from '../combos/combos.module';

@Module({
  imports: [
    ConfigModule,
    CombosModule,
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Showtime.name, schema: ShowtimeSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MomoService],
  exports: [PaymentsService, MomoService],
})
export class PaymentsModule {}
