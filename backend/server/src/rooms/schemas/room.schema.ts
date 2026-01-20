import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Cinema } from '../../cinemas/schemas/cinema.schema';

export type RoomDocument = HydratedDocument<Room>;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string; // VD: "Phòng 01", "IMAX Theater"

  // Liên kết: Phòng này thuộc Rạp nào?
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', required: true })
  cinema: Cinema;

  @Prop({ required: true })
  type: string; // VD: "2D", "3D", "4DX"

  // Để vẽ sơ đồ ghế
  @Prop({ required: true })
  rows: number; // Tổng số hàng (VD: 10 hàng A->J)

  @Prop({ required: true })
  columns: number; // Tổng số ghế mỗi hàng (VD: 12 ghế 1->12)

  // Tự động tính: rows * columns
  @Prop()
  total_seats: number;

  // Trạng thái phòng: true = hoạt động, false = bảo trì
  @Prop({ default: true })
  is_active: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);