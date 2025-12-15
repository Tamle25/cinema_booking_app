import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CinemaDocument = HydratedDocument<Cinema>;

@Schema()
export class Cinema {
  @Prop({ required: true })
  name: string; // Tên rạp (Ví dụ: CGV...)

  @Prop()
  address: string;

  @Prop([String])
  rooms: string[]; // Danh sách phòng
}

export const CinemaSchema = SchemaFactory.createForClass(Cinema);