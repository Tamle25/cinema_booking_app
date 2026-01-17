// src/movies/movies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'; 
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie } from './schemas/movie.schema';
import { CreateMovieDto } from './dto/create-movie.dto'; // Nhớ import DTO

@Injectable()
export class MoviesService {
  constructor(@InjectModel(Movie.name) private movieModel: Model<Movie>) {}

  // 1. Lấy tất cả phim (Mới nhất lên đầu)
  async findAll(): Promise<Movie[]> {
    return this.movieModel.find().sort({ release_date: -1 }).exec();
  }

  // 2. Lấy 1 phim theo ID
  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieModel.findById(id).exec();
    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim này!');
    }
    return movie;
  }

  // 3. Thêm phim mới (Cần cho Admin) -> Mới thêm
  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    const newMovie = new this.movieModel(createMovieDto);
    return newMovie.save();
  }

  // 4. Xóa phim (Cần cho Admin) -> Mới thêm
  async remove(id: string): Promise<any> {
    const deletedMovie = await this.movieModel.findByIdAndDelete(id).exec();
    if (!deletedMovie) {
      throw new NotFoundException('Không tìm thấy phim để xóa!');
    }
    return deletedMovie;
  }
}