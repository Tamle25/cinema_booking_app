import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsDocument = HydratedDocument<News>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class News {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ required: true, trim: true })
  shortDescription: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: '' })
  thumbnail: string;

  @Prop({ default: '' })
  thumbnail_public_id: string;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({ type: String, enum: ['promotion', 'cinema'], default: 'cinema' })
  category: string;

  @Prop({ type: [String], default: [] })
  likedUsers: string[];

  @Prop({ type: Number, default: 0 })
  likesCount: number;
}

export const NewsSchema = SchemaFactory.createForClass(News);

NewsSchema.index({ slug: 1 }, { unique: true });
