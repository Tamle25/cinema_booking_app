import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Movie } from '../../movies/schemas/movie.schema';
import { Cinema } from '../../cinemas/schemas/cinema.schema';
import { Room } from '../../rooms/schemas/room.schema';

export type ShowtimeDocument = HydratedDocument<Showtime>;

@Schema({ timestamps: true })
export class Showtime {
  // 1. Phim nào?
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true })
  movie: Movie;

  // 2. Rạp nào? (Lưu để lọc cho nhanh)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', required: true })
  cinema: Cinema;

  // 3. Phòng nào?
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true })
  room: Room;

  // 4. Thời gian
  @Prop({ required: true })
  start_time: Date;

  @Prop({ required: true })
  end_time: Date; // Sẽ tự tính toán

  // 5. Giá vé cơ bản
  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: [String], default: [] }) 
  booked_seats: string[]; // Danh sách ghế đã được đặt
}

export const ShowtimeSchema = SchemaFactory.createForClass(Showtime);