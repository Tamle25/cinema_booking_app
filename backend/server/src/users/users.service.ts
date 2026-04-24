import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Hàm tạo user mới (Sẽ dùng cho chức năng Đăng ký)
  async create(createDto: any): Promise<User> {
    const createdUser = new this.userModel(createDto);
    return createdUser.save();
  }

  // Hàm tìm user theo username (Sẽ dùng cho chức năng Đăng nhập)
  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // Hàm tìm user theo ID
  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  // Cập nhật thông tin profile
  async updateProfile(id: string, updateData: { full_name?: string; avatar_url?: string }): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  // Cập nhật mật khẩu
  async updatePassword(id: string, hashPassword: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      { $set: { password: hashPassword } },
      { new: true }
    ).exec();
  }
}