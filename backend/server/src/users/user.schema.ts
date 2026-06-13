import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  full_name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  avatar_url: string;

  @Prop({ default: '' })
  avatar_public_id: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: 0 })
  availablePoints: number;

  @Prop({ default: 0 })
  lifetimePoints: number;

  @Prop({
    default: 'Member',
    enum: ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'],
  })
  membershipRank: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  emailVerificationExpires: Date;

  @Prop()
  emailVerificationLastSent: Date;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;

  @Prop()
  resetPasswordLastSent: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  flattenObjectIds: true,
  versionKey: false,

  transform: (doc, ret: any) => {
    delete ret.password;
    return ret;
  },
});
