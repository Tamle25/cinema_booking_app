import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CinemaSystem } from '../../cinema-systems/schemas/cinema-system.schema';

export type CinemaDocument = HydratedDocument<Cinema>;

@Schema({ timestamps: true })
export class Cinema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CinemaSystem',
    required: true,
  })
  cinema_system: CinemaSystem;

  @Prop()
  map_url: string;

  @Prop({ type: Number, default: null })
  latitude: number;

  @Prop({ type: Number, default: null })
  longitude: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CinemaSchema = SchemaFactory.createForClass(Cinema);
