import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MovieDocument = HydratedDocument<Movie>;

@Schema({ timestamps: true }) // Tự động tạo created_at và updated_at
export class Movie {
  @Prop({ required: true })
  title: string;

  @Prop()
  slug: string;

  @Prop()
  description: string;

  @Prop()
  poster_url: string;

  @Prop()
  banner_url: string;

  @Prop()
  trailer_url: string;

  @Prop()
  duration: number;

  @Prop()
  release_date: Date;

  @Prop()
  status: string; // 'now_showing' | 'coming_soon'

  @Prop()
  rating: number;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);