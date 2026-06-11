import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Movie } from '../../movies/schemas/movie.schema';
import { Cinema } from '../../cinemas/schemas/cinema.schema';
import { Room } from '../../rooms/schemas/room.schema';

export type ShowtimeDocument = HydratedDocument<Showtime>;

@Schema({ timestamps: true })
export class Showtime {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true })
  movie: Movie;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', required: true })
  cinema: Cinema;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true })
  room: Room;

  @Prop({ required: true })
  start_time: Date;

  @Prop({ required: true })
  end_time: Date;

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: [String], default: [] })
  booked_seats: string[];
}

export const ShowtimeSchema = SchemaFactory.createForClass(Showtime);
