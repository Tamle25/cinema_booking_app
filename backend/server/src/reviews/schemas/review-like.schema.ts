import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Review } from './review.schema';
import { User } from '../../users/user.schema';

export type ReviewLikeDocument = HydratedDocument<ReviewLike>;

@Schema({ timestamps: true })
export class ReviewLike {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true })
  review: Review;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;
}

export const ReviewLikeSchema = SchemaFactory.createForClass(ReviewLike);

// Unique: 1 user chỉ like 1 review 1 lần
ReviewLikeSchema.index({ review: 1, user: 1 }, { unique: true });
