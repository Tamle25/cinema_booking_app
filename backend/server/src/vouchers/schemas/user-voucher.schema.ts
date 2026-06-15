import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '../../users/user.schema';
import { Voucher } from './voucher.schema';

export type UserVoucherDocument = HydratedDocument<UserVoucher>;

@Schema({ timestamps: true })
export class UserVoucher {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: User;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    required: true,
  })
  voucherTemplate!: Voucher;

  @Prop({ required: true })
  code!: string;

  @Prop({ default: 'UNUSED', enum: ['UNUSED', 'USED', 'EXPIRED'] })
  status!: string;

  @Prop()
  usedAt!: Date;

  @Prop({ required: true })
  expiredAt!: Date;
}

export const UserVoucherSchema = SchemaFactory.createForClass(UserVoucher);

UserVoucherSchema.index({ user: 1, status: 1 });
UserVoucherSchema.index({ code: 1 }, { unique: true });
UserVoucherSchema.index({ status: 1, expiredAt: 1 });
