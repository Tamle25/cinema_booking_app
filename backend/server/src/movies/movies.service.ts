import { Injectable, NotFoundException } from '@nestjs/common'; 
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie } from './schemas/movie.schema';

@Injectable()
export class MoviesService {
  constructor(@InjectModel(Movie.name) private movieModel: Model<Movie>) {}

  // Lấy tất cả phim
  async findAll(): Promise<Movie[]> {
    return this.movieModel.find().exec();
  }

  // Lấy 1 phim theo ID
  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieModel.findById(id).exec();
    
    // Nếu không tìm thấy phim (kết quả là null)
    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim này!'); // Báo lỗi 404 ra ngoài
    }

    return movie;
  }
}