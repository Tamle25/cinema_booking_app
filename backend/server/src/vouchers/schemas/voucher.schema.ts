import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Cinema } from '../../cinemas/schemas/cinema.schema';

export type VoucherDocument = HydratedDocument<Voucher>;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true })
  name: string;

  @Prop({ sparse: true })
  code: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ['ADMIN_CODE', 'POINT_EXCHANGE_TEMPLATE'] })
  voucherType: string;

  @Prop({ required: true, enum: ['PERCENT', 'FIXED_AMOUNT'] })
  discountType: string;

  @Prop({ required: true })
  discountValue: number;

  @Prop({ default: 0 })
  maxDiscountAmount: number;

  @Prop({ default: 0 })
  minOrderAmount: number;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ default: 0 })
  usageLimit: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ default: false })
  isUnlimited: boolean;

  @Prop({ default: 'active', enum: ['active', 'inactive'] })
  status: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema' }],
    default: [],
  })
  applicableCinemaIds: Cinema[];

  @Prop({ default: true })
  isAllCinemas: boolean;

  @Prop({
    default: 'Member',
    enum: ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'],
  })
  requiredMembershipRank: string;

  @Prop({ default: 0 })
  requiredPoints: number;

  @Prop({ default: 30 })
  validDaysAfterExchange: number;

  @Prop({ default: 0 })
  exchangeLimit: number;

  @Prop({ default: 0 })
  exchangedCount: number;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

VoucherSchema.index({ code: 1 }, { unique: true, sparse: true });
VoucherSchema.index({ voucherType: 1, status: 1 });
