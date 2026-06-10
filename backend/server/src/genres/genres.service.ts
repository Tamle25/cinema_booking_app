import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Genre } from './schemas/genre.schema';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name) private genreModel: Model<Genre>) {}

  private generateSlug(name: string): string {
    const vietnameseMap: Record<string, string> = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd',
    };

    return name
      .toLowerCase()
      .split('')
      .map(char => vietnameseMap[char] || char)
      .join('')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async findAll(): Promise<Genre[]> {
    return this.genreModel.find().sort({ name: 1 }).exec();
  }

  async findAllActive(): Promise<Genre[]> {
    return this.genreModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }
    return genre;
  }

  async create(createGenreDto: CreateGenreDto): Promise<Genre> {
    const slug = this.generateSlug(createGenreDto.name);

    const existing = await this.genreModel.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${createGenreDto.name.trim()}$`, 'i') } },
        { slug },
      ],
    }).exec();

    if (existing) {
      throw new ConflictException('Thể loại này đã tồn tại!');
    }

    const newGenre = new this.genreModel({
      ...createGenreDto,
      name: createGenreDto.name.trim(),
      slug,
    });
    return newGenre.save();
  }

  async update(id: string, updateGenreDto: UpdateGenreDto): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }

    if (updateGenreDto.name) {
      const newSlug = this.generateSlug(updateGenreDto.name);

      const existing = await this.genreModel.findOne({
        _id: { $ne: id },
        $or: [
          { name: { $regex: new RegExp(`^${updateGenreDto.name.trim()}$`, 'i') } },
          { slug: newSlug },
        ],
      }).exec();

      if (existing) {
        throw new ConflictException('Tên thể loại này đã tồn tại!');
      }

      (updateGenreDto as any).slug = newSlug;
      updateGenreDto.name = updateGenreDto.name.trim();
    }

    const updated = await this.genreModel
      .findByIdAndUpdate(id, updateGenreDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }
    return updated;
  }

  async toggleActive(id: string): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }

    genre.isActive = !genre.isActive;
    return genre.save();
  }

  async remove(id: string, movieModel: Model<any>): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }

    const movieCount = await movieModel.countDocuments({ genres: id }).exec();
    if (movieCount > 0) {
      throw new BadRequestException(
        `Không thể xóa! Vẫn còn ${movieCount} phim đang sử dụng thể loại "${genre.name}". Hãy gỡ thể loại khỏi các phim trước khi xóa.`,
      );
    }

    const deleted = await this.genreModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }
    return deleted;
  }
}
