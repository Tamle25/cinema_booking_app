import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowtimesModule } from '../showtimes/showtimes.module';
import { SeatLockService } from './seat-lock.service';
import { SeatGateway } from './seat.gateway';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';

@Module({
  imports: [
    ShowtimesModule,
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
  ],
  providers: [SeatLockService, SeatGateway],
  exports: [SeatLockService, SeatGateway],
})
export class RealtimeModule {}
