import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Showtime } from '../../showtimes/schemas/showtime.schema';
import { User } from '../../users/user.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true })
  showtime: Showtime;

  // --- THAY ĐỔI Ở ĐÂY ---
  // Thay vì lưu string, ta lưu ObjectId và trỏ tới bảng User
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User; 
  // ---------------------

  @Prop([String])
  seats: string[];

  @Prop({ required: true })
  total_price: number;

  @Prop({ default: 'confirmed' }) 
  status: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);