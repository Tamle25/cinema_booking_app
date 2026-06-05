import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '../../users/user.schema';
import { Voucher } from './voucher.schema';

export type UserVoucherDocument = HydratedDocument<UserVoucher>;

@Schema({ timestamps: true })
export class UserVoucher {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true })
  voucherTemplate: Voucher; // Mẫu voucher gốc

  @Prop({ required: true, unique: true })
  code: string; // Mã voucher ngẫu nhiên duy nhất

  @Prop({ default: 'UNUSED', enum: ['UNUSED', 'USED', 'EXPIRED'] })
  status: string;

  @Prop()
  usedAt: Date; // Thời điểm sử dụng

  @Prop({ required: true })
  expiredAt: Date; // Thời điểm hết hạn
}

export const UserVoucherSchema = SchemaFactory.createForClass(UserVoucher);

// Index cho tìm kiếm voucher cá nhân
UserVoucherSchema.index({ user: 1, status: 1 });
UserVoucherSchema.index({ code: 1 }, { unique: true });
UserVoucherSchema.index({ status: 1, expiredAt: 1 }); // Cho scheduler hết hạn
