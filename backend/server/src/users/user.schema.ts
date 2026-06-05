import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  full_name: string;

  @Prop({ required: true, unique: true }) // Email không được trùng
  email: string;

  @Prop() 
  avatar_url: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'user' }) // 'user' hoặc 'admin'
  role: string;

  @Prop({ default: 0 })
  availablePoints: number; // Điểm khả dụng để đổi voucher

  @Prop({ default: 0 })
  lifetimePoints: number; // Tổng điểm tích lũy trọn đời (dùng xét hạng)

  @Prop({ default: 'Member', enum: ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'] })
  membershipRank: string; // Hạng thành viên hiện tại
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  flattenObjectIds: true, // Chuyển _id (Object) thành id (String) cho đẹp
  versionKey: false,      // Bỏ field __v (version key của Mongoose)
  transform: (doc, ret: any) => {
    delete ret.password;  // <--- Quan trọng nhất: Xóa mật khẩu
    return ret;
  },
});