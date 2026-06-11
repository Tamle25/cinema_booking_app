import {
  Body,
  Controller,
  Put,
  Get,
  UseGuards,
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const avatarStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'users'),
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.usersService.findById(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(
    @Request() req: any,
    @Body() body: { full_name?: string; avatar_url?: string },
  ) {
    const userId = req.user._id || req.user.id;
    const { full_name, avatar_url } = body;

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Không có dữ liệu hợp lệ để cập nhật');
    }

    const updatedUser = await this.usersService.updateProfile(
      userId,
      updateData,
    );

    if (!updatedUser) {
      throw new BadRequestException('Bản ghi người dùng không tồn tại');
    }

    const userObject = updatedUser.toObject();
    delete (userObject as any).password;

    return userObject;
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('password')
  async updatePassword(
    @Request() req: any,
    @Body() body: { old_password?: string; new_password?: string },
  ) {
    const userId = req.user._id || req.user.id;
    const { old_password, new_password } = body;

    if (!old_password || !new_password) {
      throw new BadRequestException(
        'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Bản ghi người dùng không tồn tại');
    }

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(new_password, salt);

    await this.usersService.updatePassword(userId, hashPassword);

    return { message: 'Cập nhật mật khẩu thành công' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: avatarStorage,
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Chỉ chấp nhận file ảnh!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  uploadAvatar(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException(
        'Không có file nào được upload hoặc sai định dạng',
      );
    }
    const imageUrl = `/uploads/users/${file.filename}`;
    return { avatar_url: imageUrl };
  }
}
