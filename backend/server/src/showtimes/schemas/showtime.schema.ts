import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ShowtimeDocument = HydratedDocument<Showtime>;

@Schema()
export class Showtime {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Movie', required: true })
  movie: string; // Liên kết tới bảng Movie

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Cinema', required: true })
  cinema: string; // Liên kết tới bảng Cinema (để lấy tên rạp)

  @Prop({ required: true })
  room: string;

  @Prop({ required: true })
  start_time: Date;

  @Prop({ required: true })
  price: number;

  @Prop([String])
  booked_seats: string[]; // Ví dụ: ["A1", "A2"]
}

export const ShowtimeSchema = SchemaFactory.createForClass(Showtime);