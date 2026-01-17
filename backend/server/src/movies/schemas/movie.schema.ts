// File: src/movies/schemas/movie.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MovieDocument = HydratedDocument<Movie>;

@Schema({ timestamps: true })
export class Movie {
  @Prop({ required: true })
  title: string;
  
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  poster_url: string;

  @Prop({ default: "" })
  banner_url: string;

  @Prop({ default: "" })
  trailer_url: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  genre: string;

  @Prop()
  duration: number;

  @Prop({ required: true })
  release_date: Date;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);