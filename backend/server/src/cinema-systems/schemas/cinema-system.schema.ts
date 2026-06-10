import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CinemaSystemDocument = HydratedDocument<CinemaSystem>;

@Schema({ timestamps: true })
export class CinemaSystem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  logo_url: string;

  @Prop()
  color_code: string;
}

export const CinemaSystemSchema = SchemaFactory.createForClass(CinemaSystem);
