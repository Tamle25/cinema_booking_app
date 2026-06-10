import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Cinema } from '../../cinemas/schemas/cinema.schema';

export type RoomDocument = HydratedDocument<Room>;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', required: true })
  cinema: Cinema;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  rows: number;

  @Prop({ required: true })
  columns: number;

  @Prop()
  total_seats: number;

  @Prop({ default: true })
  is_active: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
