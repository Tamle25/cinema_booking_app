import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionDocument } from './schemas/promotion.schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name)
    private promotionModel: Model<PromotionDocument>,
  ) {}

  // Tạo promotion mới
  async create(createDto: CreatePromotionDto): Promise<Promotion> {
    const created = new this.promotionModel(createDto);
    return created.save();
  }

  // Lấy tất cả promotions (cho admin)
  async findAll(): Promise<Promotion[]> {
    return this.promotionModel.find().sort({ createdAt: -1 }).exec();
  }

  // Lấy promotions đang active (cho user/homepage)
  async findActive(): Promise<Promotion[]> {
    const now = new Date();
    return this.promotionModel
      .find({
        is_active: true,
        $or: [
          // Không có ngày kết thúc → luôn hiển thị
          { end_date: { $exists: false } },
          { end_date: null },
          // Chưa hết hạn
          { end_date: { $gte: now } },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lấy chi tiết 1 promotion
  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.promotionModel.findById(id).exec();
    if (!promotion) {
      throw new NotFoundException(`Không tìm thấy khuyến mãi với id ${id}`);
    }
    return promotion;
  }

  // Cập nhật promotion
  async update(id: string, updateDto: UpdatePromotionDto): Promise<Promotion> {
    const updated = await this.promotionModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy khuyến mãi với id ${id}`);
    }
    return updated;
  }

  // Xóa promotion
  async remove(id: string): Promise<Promotion> {
    const deleted = await this.promotionModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy khuyến mãi với id ${id}`);
    }
    return deleted;
  }
}
