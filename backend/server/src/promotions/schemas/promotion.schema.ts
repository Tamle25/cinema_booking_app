import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromotionDocument = HydratedDocument<Promotion>;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  image: string; // URL ảnh khuyến mãi

  @Prop({ default: 'event', enum: ['hot', 'sale', 'free', 'event'] })
  type: string;

  @Prop({ default: 0 })
  discount_value: number; // Giá trị giảm giá (%)

  @Prop()
  start_date: Date;

  @Prop()
  end_date: Date;

  @Prop({ default: true })
  is_active: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
