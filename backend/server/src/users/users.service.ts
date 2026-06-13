import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createDto: any): Promise<User> {
    const createdUser = new this.userModel(createDto);
    return createdUser.save();
  }

  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateProfile(
    id: string,
    updateData: {
      full_name?: string;
      avatar_url?: string;
      avatar_public_id?: string;
    },
  ): Promise<UserDocument | null> {
    const existing = await this.userModel.findById(id).exec();
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (
      existing &&
      updateData.avatar_url !== undefined &&
      existing.avatar_url &&
      existing.avatar_url !== updateData.avatar_url
    ) {
      await this.cloudinaryService.destroyImage(
        existing.avatar_public_id ||
          this.cloudinaryService.extractPublicIdFromUrl(existing.avatar_url),
      );
    }

    return updated;
  }

  async updatePassword(
    id: string,
    hashPassword: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { password: hashPassword } },
        { new: true },
      )
      .exec();
  }
}
