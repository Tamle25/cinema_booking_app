import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '../../users/user.schema';
import { Movie } from '../../movies/schemas/movie.schema';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true })
  movie: Movie;

  @Prop({ required: true, min: 1, max: 10 })
  rating: number;

  @Prop({ required: true, minlength: 10, maxlength: 1000 })
  content: string;

  @Prop({ default: true })
  is_verified: boolean;

  @Prop({ default: 0 })
  likes_count: number;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ movie: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, movie: 1 }, { unique: true });
ReviewSchema.index({ is_verified: 1, rating: -1 });
