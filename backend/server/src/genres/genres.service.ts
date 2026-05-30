import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Genre } from './schemas/genre.schema';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name) private genreModel: Model<Genre>) {}

  // Helper: Tạo slug từ tên tiếng Việt
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

  // 1. Lấy tất cả thể loại (Admin)
  async findAll(): Promise<Genre[]> {
    return this.genreModel.find().sort({ name: 1 }).exec();
  }

  // 2. Lấy thể loại đang active (Public)
  async findAllActive(): Promise<Genre[]> {
    return this.genreModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  // 3. Lấy 1 thể loại theo ID
  async findOne(id: string): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }
    return genre;
  }

  // 4. Tạo thể loại mới
  async create(createGenreDto: CreateGenreDto): Promise<Genre> {
    const slug = this.generateSlug(createGenreDto.name);

    // Kiểm tra trùng tên hoặc slug
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

  // 5. Cập nhật thể loại
  async update(id: string, updateGenreDto: UpdateGenreDto): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }

    // Nếu đổi tên → cập nhật slug
    if (updateGenreDto.name) {
      const newSlug = this.generateSlug(updateGenreDto.name);

      // Kiểm tra trùng tên/slug với genre khác
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

  // 6. Ẩn/Hiện thể loại
  async toggleActive(id: string): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }

    genre.isActive = !genre.isActive;
    return genre.save();
  }

  // 7. Xóa thể loại (kiểm tra movie đang dùng)
  async remove(id: string, movieModel: Model<any>): Promise<Genre> {
    const genre = await this.genreModel.findById(id).exec();
    if (!genre) {
      throw new NotFoundException('Không tìm thấy thể loại!');
    }

    // Kiểm tra có phim nào đang sử dụng thể loại này không
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
