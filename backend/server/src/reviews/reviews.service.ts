import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { ReviewLike, ReviewLikeDocument } from './schemas/review-like.schema';
import { Movie } from '../movies/schemas/movie.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewLike.name) private reviewLikeModel: Model<ReviewLikeDocument>,
    @InjectModel(Movie.name) private movieModel: Model<Movie>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
  ) {}

  /**
   * Tạo review mới
   * - Kiểm tra user đã mua vé (booking status = 'confirmed')
   * - Mỗi user chỉ review 1 lần / phim
   * - Tự động cập nhật rating trong Movie
   */
  async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
    const { movie_id, rating, content } = dto;

    // 1. Kiểm tra phim tồn tại
    const movie = await this.movieModel.findById(movie_id);
    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim');
    }

    // 2. Kiểm tra user đã mua vé và thanh toán thành công
    const hasPaidBooking = await this.bookingModel.findOne({
      user: userId,
      status: 'confirmed',
    }).populate({
      path: 'showtime',
      match: { movie: movie_id },
    });

    // Kiểm tra cả showtime có match movie không
    if (!hasPaidBooking || !hasPaidBooking.showtime) {
      throw new ForbiddenException('Bạn cần mua vé và thanh toán thành công để đánh giá phim này');
    }

    // 3. Kiểm tra đã review chưa
    const existingReview = await this.reviewModel.findOne({
      user: userId,
      movie: movie_id,
    });
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá phim này rồi');
    }

    // 4. Tạo review
    const review = new this.reviewModel({
      user: userId,
      movie: movie_id,
      rating,
      content,
      is_verified: true,
    });
    const saved = await review.save();

    // 5. Cập nhật rating trung bình của phim
    await this.updateMovieRating(movie_id);

    return saved;
  }

  /**
   * Lấy danh sách review theo phim (có pagination)
   */
  async getMovieReviews(
    movieId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = 'newest',
  ) {
    const skip = (page - 1) * limit;

    // Sort options
    let sortOption: any = { createdAt: -1 }; // Mới nhất
    if (sort === 'highest_rating') {
      sortOption = { rating: -1, createdAt: -1 };
    }

    const [reviews, totalItems] = await Promise.all([
      this.reviewModel
        .find({ movie: movieId })
        .populate('user', 'full_name avatar_url')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ movie: movieId }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: reviews,
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

  /**
   * Lấy reviews nổi bật cho trang chủ
   * - Chỉ lấy review verified
   * - Group theo movie, lấy top 3 review / movie
   * - Sort: rating cao, nhiều like, mới nhất
   */
  async getFeaturedReviews() {
    // Lấy danh sách phim có review, kèm rating/count
    const moviesWithReviews = await this.movieModel
      .find({
        review_count: { $gt: 0 },
        is_active: true,
      })
      .sort({ rating: -1, review_count: -1 })
      .limit(6)
      .exec();

    const result: any[] = [];

    for (const movie of moviesWithReviews) {
      // Lấy top 3 review cho mỗi phim
      const reviews = await this.reviewModel
        .find({
          movie: movie._id,
          is_verified: true,
        })
        .populate('user', 'full_name avatar_url')
        .sort({ likes_count: -1, rating: -1, createdAt: -1 })
        .limit(3)
        .exec();

      if (reviews.length > 0) {
        result.push({
          movie,
          rating_avg: movie.rating,
          review_count: movie.review_count,
          reviews,
        });
      }
    }

    return result;
  }

  /**
   * Lấy danh sách phim có review (cho trang /reviews)
   */
  async getMoviesWithReviews(
    page: number = 1,
    limit: number = 12,
    sort: string = 'hot',
  ) {
    const skip = (page - 1) * limit;

    let sortOption: any = { review_count: -1, rating: -1 }; // Hot = nhiều review nhất
    if (sort === 'highest_rating') {
      sortOption = { rating: -1, review_count: -1 };
    } else if (sort === 'newest') {
      sortOption = { updatedAt: -1 };
    }

    const [movies, totalItems] = await Promise.all([
      this.movieModel
        .find({
          review_count: { $gt: 0 },
          is_active: true,
        })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.movieModel.countDocuments({
        review_count: { $gt: 0 },
        is_active: true,
      }),
    ]);

    // Lấy top 2 review cho mỗi phim
    const result: any[] = [];
    for (const movie of movies) {
      const reviews = await this.reviewModel
        .find({ movie: movie._id, is_verified: true })
        .populate('user', 'full_name avatar_url')
        .sort({ likes_count: -1, rating: -1 })
        .limit(2)
        .exec();

      result.push({
        movie,
        rating_avg: movie.rating,
        review_count: movie.review_count,
        reviews,
      });
    }

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: result,
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

  /**
   * Like / Unlike review
   */
  async toggleLike(reviewId: string, userId: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    const existingLike = await this.reviewLikeModel.findOne({
      review: reviewId,
      user: userId,
    });

    if (existingLike) {
      // Unlike
      await this.reviewLikeModel.deleteOne({ _id: existingLike._id });
      await this.reviewModel.findByIdAndUpdate(reviewId, {
        $inc: { likes_count: -1 },
      });
      return { liked: false };
    } else {
      // Like
      const like = new this.reviewLikeModel({
        review: reviewId,
        user: userId,
      });
      await like.save();
      await this.reviewModel.findByIdAndUpdate(reviewId, {
        $inc: { likes_count: 1 },
      });
      return { liked: true };
    }
  }

  /**
   * Xóa review (chỉ chính chủ)
   */
  async deleteReview(reviewId: string, userId: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (review.user.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');
    }

    const movieId = review.movie.toString();

    // Xóa likes liên quan
    await this.reviewLikeModel.deleteMany({ review: reviewId });
    // Xóa review
    await this.reviewModel.findByIdAndDelete(reviewId);

    // Cập nhật rating
    await this.updateMovieRating(movieId);

    return { message: 'Đã xóa đánh giá thành công' };
  }

  /**
   * Kiểm tra user đã review phim chưa
   */
  async checkUserReview(userId: string, movieId: string) {
    const review = await this.reviewModel.findOne({
      user: userId,
      movie: movieId,
    });
    return { hasReviewed: !!review, review };
  }

  /**
   * Kiểm tra user đã mua vé phim chưa
   */
  async checkUserHasTicket(userId: string, movieId: string) {
    const booking = await this.bookingModel.findOne({
      user: userId,
      status: 'confirmed',
    }).populate({
      path: 'showtime',
      match: { movie: movieId },
    });

    return { hasTicket: !!(booking && booking.showtime) };
  }

  /**
   * Tính và cập nhật rating trung bình vào Movie
   * Công thức: rating = AVG(reviews.rating WHERE is_verified = true)
   * Làm tròn 1 chữ số thập phân
   */
  private async updateMovieRating(movieId: string) {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          movie: new Types.ObjectId(movieId),
          is_verified: true,
        },
      },
      {
        $group: {
          _id: null,
          avg_rating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    let rating = 0;
    let reviewCount = 0;

    if (result.length > 0) {
      // Làm tròn 1 chữ số thập phân: 9.26 → 9.3, 8.24 → 8.2
      const raw = result[0].avg_rating;
      rating = Math.round(raw * 10) / 10;
      reviewCount = result[0].count;
    }

    await this.movieModel.findByIdAndUpdate(movieId, {
      rating,
      review_count: reviewCount,
    });
  }
}
