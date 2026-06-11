import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '../../users/user.schema';
import { Booking } from '../../bookings/schemas/booking.schema';

export type PointTransactionDocument = HydratedDocument<PointTransaction>;

@Schema({ timestamps: true })
export class PointTransaction {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' })
  order: Booking;

  @Prop({
    required: true,
    enum: ['EARN', 'REDEEM', 'EXPIRE', 'REFUND', 'ADJUST'],
  })
  type: string;

  @Prop({ required: true })
  points: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  expiredAt: Date;

  @Prop({ default: false })
  isExpired: boolean;
}

export const PointTransactionSchema =
  SchemaFactory.createForClass(PointTransaction);

PointTransactionSchema.index({ user: 1, createdAt: -1 });
PointTransactionSchema.index({ type: 1, isExpired: 1, expiredAt: 1 });
