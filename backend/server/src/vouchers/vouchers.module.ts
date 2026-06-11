import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { UserVoucher, UserVoucherSchema } from './schemas/user-voucher.schema';
import {
  VoucherUsage,
  VoucherUsageSchema,
} from './schemas/voucher-usage.schema';
import { User, UserSchema } from '../users/user.schema';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    LoyaltyModule,
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema },
      { name: UserVoucher.name, schema: UserVoucherSchema },
      { name: VoucherUsage.name, schema: VoucherUsageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
