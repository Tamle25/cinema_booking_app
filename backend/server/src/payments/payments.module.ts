import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MomoService } from './momo.service';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Showtime, ShowtimeSchema } from '../showtimes/schemas/showtime.schema';
import { User, UserSchema } from '../users/user.schema';
import { CombosModule } from '../combos/combos.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    ConfigModule,
    CombosModule,
    LoyaltyModule,
    VouchersModule,
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Showtime.name, schema: ShowtimeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MomoService],
  exports: [PaymentsService, MomoService],
})
export class PaymentsModule {}

