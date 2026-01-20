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
}

export const BookingSchema = SchemaFactory.createForClass(Booking);