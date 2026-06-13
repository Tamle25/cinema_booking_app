import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import {
  hasValidImageSignature,
  ImageUploadInterceptor,
} from '../common/upload/image-upload.interceptor';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UsersService } from './users.service';

const MAX_AVATAR_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
type AuthenticatedRequest = {
  user: {
    _id?: string;
    id?: string;
  };
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const userId = this.getRequestUserId(req);
    return this.usersService.findById(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      full_name?: string;
      avatar_url?: string;
      avatar_public_id?: string;
    },
  ) {
    const userId = this.getRequestUserId(req);
    const { full_name, avatar_url, avatar_public_id } = body;

    const updateData: {
      full_name?: string;
      avatar_url?: string;
      avatar_public_id?: string;
    } = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (avatar_public_id !== undefined) {
      updateData.avatar_public_id = avatar_public_id;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Khong co du lieu hop le de cap nhat');
    }

    const updatedUser = await this.usersService.updateProfile(
      userId,
      updateData,
    );

    if (!updatedUser) {
      throw new BadRequestException('Ban ghi nguoi dung khong ton tai');
    }

    const userObject = updatedUser.toObject() as unknown as Record<
      string,
      unknown
    >;
    delete userObject.password;

    return userObject;
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('password')
  async updatePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { old_password?: string; new_password?: string },
  ) {
    const userId = this.getRequestUserId(req);
    const { old_password, new_password } = body;

    if (!old_password || !new_password) {
      throw new BadRequestException('Vui long cung cap mat khau cu va moi');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Ban ghi nguoi dung khong ton tai');
    }

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mat khau cu khong chinh xac');
    }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(new_password, salt);

    await this.usersService.updatePassword(userId, hashPassword);

    return { message: 'Cap nhat mat khau thanh cong' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-avatar')
  @UseInterceptors(ImageUploadInterceptor('image', MAX_AVATAR_IMAGE_SIZE_BYTES))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Khong co file duoc upload');
    }

    if (!hasValidImageSignature(file)) {
      throw new BadRequestException('File khong dung dinh dang anh hop le');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file,
      'cinemax/users/avatars',
    );

    return {
      avatar_url: uploaded.secure_url,
      avatar_public_id: uploaded.public_id,
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  }

  private getRequestUserId(req: AuthenticatedRequest) {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      throw new BadRequestException('Khong tim thay user id trong token');
    }
    return userId;
  }
}
