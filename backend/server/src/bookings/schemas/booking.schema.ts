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

  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'failed', 'expired', 'cancelled'] }) 
  status: string;

  @Prop({ default: 'momo', enum: ['momo'] })
  payment_method: string;

  @Prop({ index: true })
  momo_order_id: string;

  @Prop()
  momo_trans_id: string;

  @Prop()
  momo_result_code: string;

  @Prop()
  payment_note: string;

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

  @Prop({ default: 0 })
  originalPrice: number;

  @Prop({ default: 0 })
  membershipDiscount: number;

  @Prop({ default: 0 })
  voucherDiscount: number;

  @Prop()
  appliedVoucherCode: string;

  @Prop({ default: false })
  pointsAwarded: boolean;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);