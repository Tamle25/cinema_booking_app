import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { News } from './schemas/news.schema';

type MongoDuplicateKeyError = {
  code?: number;
  keyPattern?: Record<string, unknown>;
};

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(News.name) private readonly newsModel: Model<News>,
    private readonly cloudinaryService: CloudinaryService,
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
      throw new NotFoundException('Khong tim thay tin tuc');
    }

    return news;
  }

  async findOneAdmin(id: string): Promise<News> {
    const news = await this.newsModel.findById(id).exec();
    if (!news) {
      throw new NotFoundException('Khong tim thay tin tuc');
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
        throw new NotFoundException('Khong tim thay tin tuc');
      }

      await this.deleteReplacedNewsImages(existingNews, updateNewsDto);
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
      throw new NotFoundException('Khong tim thay tin tuc');
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.newsModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Khong tim thay tin tuc');
    }

    await this.deleteNewsImages(deleted);
    return { message: 'Xoa tin tuc thanh cong' };
  }

  private async deleteReplacedNewsImages(
    existingNews: News,
    updateNewsDto: UpdateNewsDto,
  ) {
    const tasks: Promise<void>[] = [];

    if (
      updateNewsDto.thumbnail !== undefined &&
      existingNews.thumbnail &&
      existingNews.thumbnail !== updateNewsDto.thumbnail
    ) {
      tasks.push(
        this.cloudinaryService.destroyImage(
          existingNews.thumbnail_public_id ||
            this.cloudinaryService.extractPublicIdFromUrl(
              existingNews.thumbnail,
            ),
        ),
      );
    }

    if (updateNewsDto.content !== undefined) {
      const previousIds = new Set(
        this.cloudinaryService.extractPublicIdsFromHtml(existingNews.content),
      );
      const nextIds = new Set(
        this.cloudinaryService.extractPublicIdsFromHtml(updateNewsDto.content),
      );

      for (const publicId of previousIds) {
        if (!nextIds.has(publicId)) {
          tasks.push(this.cloudinaryService.destroyImage(publicId));
        }
      }
    }

    await Promise.all(tasks);
  }

  private async deleteNewsImages(news: News) {
    const publicIds = new Set(
      this.cloudinaryService.extractPublicIdsFromHtml(news.content),
    );
    const thumbnailPublicId =
      news.thumbnail_public_id ||
      this.cloudinaryService.extractPublicIdFromUrl(news.thumbnail);

    if (thumbnailPublicId) publicIds.add(thumbnailPublicId);

    await Promise.all(
      Array.from(publicIds).map((publicId) =>
        this.cloudinaryService.destroyImage(publicId),
      ),
    );
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
      throw new BadRequestException('Slug khong hop le');
    }

    return normalized;
  }

  async toggleLike(
    id: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const news = await this.newsModel.findById(id).exec();
    if (!news) {
      throw new NotFoundException('Khong tim thay tin tuc');
    }

    if (!news.likedUsers) {
      news.likedUsers = [];
    }

    const index = news.likedUsers.indexOf(userId);
    let liked = false;

    if (index > -1) {
      news.likedUsers.splice(index, 1);
      liked = false;
    } else {
      news.likedUsers.push(userId);
      liked = true;
    }

    news.likesCount = news.likedUsers.length;
    await news.save();

    return { liked, likesCount: news.likesCount };
  }

  private handleDuplicateSlug(error: unknown) {
    const mongoError = error as MongoDuplicateKeyError;
    if (mongoError.code === 11000 && mongoError.keyPattern?.slug) {
      throw new BadRequestException('Slug da ton tai');
    }
  }
}
