import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ComboDocument = HydratedDocument<Combo>;

@Schema({ timestamps: true })
export class Combo {
  @Prop({ type: Types.ObjectId, ref: 'CinemaSystem', required: true })
  cinema_system: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: '' })
  image_url: string;

  @Prop({ default: '' })
  image_public_id: string;

  @Prop({ default: 'combo', enum: ['combo', 'drink', 'snack'] })
  category: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_popular: boolean;
}

export const ComboSchema = SchemaFactory.createForClass(Combo);
