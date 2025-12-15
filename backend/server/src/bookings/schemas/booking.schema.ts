import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true }) // Tự động lưu thời gian tạo (createdAt)
export class Booking {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Showtime', required: true })
  showtime: string; // Vé này thuộc suất chiếu nào?

  @Prop([String])
  seats: string[]; // Danh sách ghế (VD: ["A1", "A2"])

  @Prop()
  total_price: number; // Tổng tiền
}

export const BookingSchema = SchemaFactory.createForClass(Booking);