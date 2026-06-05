import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Showtime } from '../../showtimes/schemas/showtime.schema';
import { User } from '../../users/user.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true })
  showtime: Showtime;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User; 

  @Prop([String])
  seats: string[];

  @Prop({ required: true })
  total_price: number;

  // Trạng thái: pending (chờ thanh toán), confirmed (đã thanh toán), failed (thất bại), expired (hết hạn), cancelled (đã hủy)
  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'failed', 'expired', 'cancelled'] }) 
  status: string;

  // Phương thức thanh toán: momo
  @Prop({ default: 'momo', enum: ['momo'] })
  payment_method: string;

  // Mã đơn hàng MoMo (dùng để mapping với MoMo callback)
  @Prop({ index: true })
  momo_order_id: string;

  // Mã giao dịch MoMo
  @Prop()
  momo_trans_id: string;

  // Mã kết quả MoMo
  @Prop()
  momo_result_code: string;

  // Ghi chú thanh toán
  @Prop()
  payment_note: string;

  // Combo bắp nước đã chọn (snapshot giá tại thời điểm đặt)
  @Prop({
    type: [{
      combo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Combo' },
      name: String,
      price: Number,
      quantity: Number,
    }],
    default: [],
  })
  combos: Array<{
    combo_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;

  // Giá gốc trước khi giảm giá
  @Prop({ default: 0 })
  originalPrice: number;

  // Số tiền giảm từ hạng thành viên
  @Prop({ default: 0 })
  membershipDiscount: number;

  // Số tiền giảm từ voucher
  @Prop({ default: 0 })
  voucherDiscount: number;

  // Mã voucher đã áp dụng
  @Prop()
  appliedVoucherCode: string;

  // Đã cộng điểm cho đơn này chưa (tránh cộng trùng)
  @Prop({ default: false })
  pointsAwarded: boolean;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);