import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserSchema } from './user.schema';

@Module({
  imports: [
    // Đăng ký bảng User vào Mongoose
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  exports: [UsersService], // Xuất Service này để AuthModule có thể dùng
})
export class UsersModule {}