import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CinemaSystemDocument = HydratedDocument<CinemaSystem>;

@Schema({ timestamps: true })
export class CinemaSystem {
  @Prop({ required: true })
  name: string; // VD: "CGV Cinemas", "Beta Cinemas"

  @Prop({ required: true, unique: true })
  slug: string; // VD: "cgv", "beta-cinemas"

  @Prop()
  logo_url: string; // Logo thương hiệu

  @Prop()
  color_code: string;
}

export const CinemaSystemSchema = SchemaFactory.createForClass(CinemaSystem);