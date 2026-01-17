import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CinemaSystem } from '../../cinema-systems/schemas/cinema-system.schema';

export type CinemaDocument = HydratedDocument<Cinema>;

@Schema({ timestamps: true })
export class Cinema {
  @Prop({ required: true })
  name: string; // VD: "Beta Mỹ Đình"

  @Prop({ required: true, unique: true })
  slug: string; // VD: "beta-my-dinh"

  @Prop()
  address: string; // VD: "Tầng hầm B1, Tòa nhà Golden Palace..."

  @Prop()
  city: string; // VD: "Hà Nội"

  // QUAN TRỌNG: Liên kết với thương hiệu cha
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CinemaSystem', required: true })
  cinema_system: CinemaSystem;

  @Prop()
  map_url: string; // Link Google Map
}

export const CinemaSchema = SchemaFactory.createForClass(Cinema);