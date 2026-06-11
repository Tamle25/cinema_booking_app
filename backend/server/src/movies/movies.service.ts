import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './schemas/movie.schema';

@Injectable()
export class MoviesService {
  constructor(
    @InjectModel(Movie.name) private movieModel: Model<Movie>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

  async findAllPaginated(page: number, limit: number): Promise<any> {
    const skip = (page - 1) * limit;
    const totalItems = await this.movieModel.countDocuments().exec();
    const data = await this.movieModel
      .find()
      .populate('genres')
      .sort({ release_date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách phim thành công',
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieModel.findById(id).populate('genres').exec();
    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim này!');
    }

    return movie;
  }

  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    const newMovie = new this.movieModel(createMovieDto);
    const saved = await newMovie.save();
    return saved.populate('genres');
  }

  async remove(id: string): Promise<any> {
    const deletedMovie = await this.movieModel.findByIdAndDelete(id).exec();
    if (!deletedMovie) {
      throw new NotFoundException('Không tìm thấy phim để xóa!');
    }

    await this.deleteMovieImages(deletedMovie);
    return deletedMovie;
  }

  async update(id: string, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    const existingMovie = await this.movieModel.findById(id).exec();
    if (!existingMovie) {
      throw new NotFoundException(`Không tìm thấy phim với ID: ${id}`);
    }

    const updatedMovie = await this.movieModel
      .findByIdAndUpdate(id, updateMovieDto, { new: true })
      .populate('genres')
      .exec();

    if (!updatedMovie) {
      throw new NotFoundException(`Không tìm thấy phim với ID: ${id}`);
    }

    await this.deleteReplacedMovieImages(existingMovie, updateMovieDto);
    return updatedMovie;
  }

  private async deleteReplacedMovieImages(
    existingMovie: Movie,
    updateMovieDto: UpdateMovieDto,
  ) {
    const tasks: Promise<void>[] = [];

    if (
      updateMovieDto.poster_public_id !== undefined &&
      existingMovie.poster_public_id &&
      existingMovie.poster_public_id !== updateMovieDto.poster_public_id
    ) {
      tasks.push(
        this.cloudinaryService.destroyImage(existingMovie.poster_public_id),
      );
    }

    if (
      updateMovieDto.banner_public_id !== undefined &&
      existingMovie.banner_public_id &&
      existingMovie.banner_public_id !== updateMovieDto.banner_public_id
    ) {
      tasks.push(
        this.cloudinaryService.destroyImage(existingMovie.banner_public_id),
      );
    }

    await Promise.all(tasks);
  }

  private async deleteMovieImages(movie: Movie) {
    await Promise.all([
      this.cloudinaryService.destroyImage(movie.poster_public_id),
      this.cloudinaryService.destroyImage(movie.banner_public_id),
    ]);
  }
}
