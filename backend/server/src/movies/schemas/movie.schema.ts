// File: src/movies/schemas/movie.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Genre } from '../../genres/schemas/genre.schema';

export type MovieDocument = HydratedDocument<Movie>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
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

  @Prop({ default: 0 })
  review_count: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genre' }], default: [] })
  genres: Genre[];

  @Prop()
  duration: number;

  @Prop({ required: true })
  release_date: Date;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);

MovieSchema.virtual('status').get(function (this: MovieDocument) {
  if (!this.release_date) return 'Sắp chiếu';
  
  const now = new Date();
  const releaseDate = new Date(this.release_date);

  // So sánh: Nếu ngày phát hành <= hiện tại -> Đang chiếu
  return releaseDate <= now ? 'Đang chiếu' : 'Sắp chiếu';
});