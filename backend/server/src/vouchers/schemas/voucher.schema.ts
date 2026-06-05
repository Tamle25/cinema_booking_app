import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Cinema } from '../../cinemas/schemas/cinema.schema';

export type VoucherDocument = HydratedDocument<Voucher>;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true })
  name: string; // Tên voucher

  @Prop({ sparse: true })
  code: string; // Mã voucher (chỉ cho ADMIN_CODE, unique)

  @Prop()
  description: string; // Mô tả voucher

  @Prop({ required: true, enum: ['ADMIN_CODE', 'POINT_EXCHANGE_TEMPLATE'] })
  voucherType: string; // Loại voucher

  @Prop({ required: true, enum: ['PERCENT', 'FIXED_AMOUNT'] })
  discountType: string; // Loại giảm giá

  @Prop({ required: true })
  discountValue: number; // Giá trị giảm (% hoặc số tiền)

  @Prop({ default: 0 })
  maxDiscountAmount: number; // Mức giảm tối đa (cho PERCENT)

  @Prop({ default: 0 })
  minOrderAmount: number; // Điều kiện đơn hàng tối thiểu

  // --- Chỉ dùng cho ADMIN_CODE ---
  @Prop()
  startDate: Date; // Thời gian bắt đầu

  @Prop()
  endDate: Date; // Thời gian kết thúc

  // --- Giới hạn sử dụng ---
  @Prop({ default: 0 })
  usageLimit: number; // Số lượng sử dụng tối đa

  @Prop({ default: 0 })
  usedCount: number; // Số lượt đã sử dụng

  @Prop({ default: false })
  isUnlimited: boolean; // Không giới hạn số lượt

  // --- Trạng thái ---
  @Prop({ default: 'active', enum: ['active', 'inactive'] })
  status: string;

  // --- Rạp áp dụng ---
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema' }], default: [] })
  applicableCinemaIds: Cinema[];

  @Prop({ default: true })
  isAllCinemas: boolean; // Áp dụng tất cả rạp

  // --- Hạng thành viên tối thiểu ---
  @Prop({ default: 'Member', enum: ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'] })
  requiredMembershipRank: string;

  // --- Chỉ dùng cho POINT_EXCHANGE_TEMPLATE ---
  @Prop({ default: 0 })
  requiredPoints: number; // Số điểm cần để đổi

  @Prop({ default: 30 })
  validDaysAfterExchange: number; // Số ngày hiệu lực sau khi đổi

  @Prop({ default: 0 })
  exchangeLimit: number; // Giới hạn số lượng đổi (0 = vô hạn)

  @Prop({ default: 0 })
  exchangedCount: number; // Số lượt đã đổi
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

// Index cho tìm kiếm voucher
VoucherSchema.index({ code: 1 }, { unique: true, sparse: true });
VoucherSchema.index({ voucherType: 1, status: 1 });
