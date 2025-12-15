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
}