import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { News } from './schemas/news.schema';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(News.name) private readonly newsModel: Model<News>,
  ) {}

  async findPublished(): Promise<News[]> {
    return this.newsModel
      .find({ isPublished: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllAdmin(): Promise<News[]> {
    return this.newsModel.find().sort({ createdAt: -1 }).exec();
  }

  async findPublishedBySlug(slug: string): Promise<News> {
    const news = await this.newsModel
      .findOne({ slug: slug.toLowerCase(), isPublished: true })
      .exec();

    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    return news;
  }

  async findOneAdmin(id: string): Promise<News> {
    const news = await this.newsModel.findById(id).exec();
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }
    return news;
  }

  async create(createNewsDto: CreateNewsDto): Promise<News> {
    const slug = await this.buildUniqueSlug(
      createNewsDto.title,
      createNewsDto.slug,
    );

    try {
      const created = new this.newsModel({
        ...createNewsDto,
        slug,
      });
      return await created.save();
    } catch (error: any) {
      this.handleDuplicateSlug(error);
      throw error;
    }
  }

  async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News> {
    const existingNews = await this.findOneAdmin(id);
    const nextData: Record<string, unknown> = { ...updateNewsDto };

    if (updateNewsDto.title || updateNewsDto.slug) {
      nextData.slug = await this.buildUniqueSlug(
        updateNewsDto.title ?? existingNews.title,
        updateNewsDto.slug,
        id,
      );
    }

    try {
      const updated = await this.newsModel
        .findByIdAndUpdate(id, nextData, { new: true })
        .exec();

      if (!updated) {
        throw new NotFoundException('Không tìm thấy tin tức');
      }

      return updated;
    } catch (error: any) {
      this.handleDuplicateSlug(error);
      throw error;
    }
  }

  async updatePublishStatus(id: string, isPublished: boolean): Promise<News> {
    const updated = await this.newsModel
      .findByIdAndUpdate(id, { isPublished }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.newsModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }
    return { message: 'Xóa tin tức thành công' };
  }

  private async buildUniqueSlug(
    title: string,
    customSlug?: string,
    excludeId?: string,
  ) {
    const baseSlug = this.slugify(customSlug || title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.isSlugTaken(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private async isSlugTaken(slug: string, excludeId?: string) {
    const existing = await this.newsModel
      .findOne({
        slug,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .select('_id')
      .lean()
      .exec();

    return Boolean(existing);
  }

  private slugify(value: string) {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/\u0110/g, 'd')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!normalized) {
      throw new BadRequestException('Slug không hợp lệ');
    }

    return normalized;
  }

  private handleDuplicateSlug(error: any) {
    if (error?.code === 11000 && error?.keyPattern?.slug) {
      throw new BadRequestException('Slug đã tồn tại');
    }
  }
}
