// src/movies/movies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'; 
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie } from './schemas/movie.schema';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MoviesService {
  constructor(@InjectModel(Movie.name) private movieModel: Model<Movie>) {}

  // 1. Lấy tất cả phim (Mới nhất lên đầu) - Dùng cho Client
  // Hỗ trợ filter theo genre ID
  async findAll(genreId?: string): Promise<Movie[]> {
    const filter: any = {};
    if (genreId) {
      filter.genres = genreId;
    }
    return this.movieModel
      .find(filter)
      .populate('genres')
      .sort({ release_date: -1 })
      .exec();
  }

  // 1b. Lấy phim phân trang cho Admin
  async findAllPaginated(page: number, limit: number): Promise<any> {
    const skip = (page - 1) * limit;
    
    // Đếm tổng số document
    const totalItems = await this.movieModel.countDocuments().exec();
    
    // Lấy data phân trang
    const data = await this.movieModel
      .find()
      .populate('genres')
      .sort({ release_date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: "Lấy danh sách phim thành công",
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }

  // 2. Lấy 1 phim theo ID
  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieModel.findById(id).populate('genres').exec();
    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim này!');
    }
    return movie;
  }

  // 3. Thêm phim mới (Cần cho Admin) -> Mới thêm
  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    const newMovie = new this.movieModel(createMovieDto);
    const saved = await newMovie.save();
    return saved.populate('genres');
  }

  // 4. Xóa phim (Cần cho Admin) -> Mới thêm
  async remove(id: string): Promise<any> {
    const deletedMovie = await this.movieModel.findByIdAndDelete(id).exec();
    if (!deletedMovie) {
      throw new NotFoundException('Không tìm thấy phim để xóa!');
    }
    return deletedMovie;
  }

  // 5. Cập nhật phim (Cần cho Admin)
  async update(id: string, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    const updatedMovie = await this.movieModel
      .findByIdAndUpdate(id, updateMovieDto, { new: true })
      .populate('genres')
      .exec();
    if (!updatedMovie) {
      throw new NotFoundException(`Không tìm thấy phim với ID: ${id}`);
    }
    return updatedMovie;
  }
}