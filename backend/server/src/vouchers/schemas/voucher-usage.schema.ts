import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '../../users/user.schema';
import { Voucher } from './voucher.schema';
import { UserVoucher } from './user-voucher.schema';
import { Booking } from '../../bookings/schemas/booking.schema';

export type VoucherUsageDocument = HydratedDocument<VoucherUsage>;

@Schema({ timestamps: true })
export class VoucherUsage {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' })
  voucher: Voucher;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserVoucher' })
  userVoucher: UserVoucher;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  })
  order: Booking;

  @Prop({ required: true })
  discountAmount: number;
}

export const VoucherUsageSchema = SchemaFactory.createForClass(VoucherUsage);

VoucherUsageSchema.index({ user: 1, createdAt: -1 });
VoucherUsageSchema.index({ user: 1, voucher: 1 }, { sparse: true });
