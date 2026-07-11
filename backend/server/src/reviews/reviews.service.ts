import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, SortOrder } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { ReviewLike, ReviewLikeDocument } from './schemas/review-like.schema';
import { Movie } from '../movies/schemas/movie.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { Showtime } from '../showtimes/schemas/showtime.schema';
import { User } from '../users/user.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewLike.name)
    private reviewLikeModel: Model<ReviewLikeDocument>,
    @InjectModel(Movie.name) private movieModel: Model<Movie>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Showtime.name) private showtimeModel: Model<Showtime>,
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
    const { movie_id, rating, content } = dto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const movie = await this.movieModel.findById(movie_id);
    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim');
    }

    const checkStatus = await this.checkUserHasTicket(userId, movie_id);
    if (!checkStatus.canReview) {
      throw new ForbiddenException(checkStatus.message);
    }

    const existingReview = await this.reviewModel.findOne({
      user: userId,
      movie: movie_id,
    });
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá phim này rồi');
    }

    const review = new this.reviewModel({
      user: userId,
      movie: movie_id,
      rating,
      content,
      is_verified: true,
    });
    const saved = await review.save();

    await this.updateMovieRating(movie_id);

    return saved;
  }

  async getMovieReviews(
    movieId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = 'newest',
    token?: string,
  ) {
    const skip = (page - 1) * limit;

    let sortOption: Record<string, SortOrder> = { createdAt: -1 };
    if (sort === 'highest_rating') {
      sortOption = { rating: -1, createdAt: -1 };
    }

    const [reviews, totalItems] = await Promise.all([
      this.reviewModel
        .find({ movie: movieId })
        .populate('user', 'full_name avatar_url membershipRank')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ movie: movieId }),
    ]);

    let userId: string | null = null;
    if (token) {
      try {
        const decoded = this.jwtService.verify(token);
        userId = decoded.sub || decoded.id || decoded._id;
      } catch {
        // Token expired or invalid, ignore
      }
    }

    let likedReviewIds: string[] = [];
    if (userId) {
      const reviewIds = reviews.map((r) => r._id.toString());
      const likes = await this.reviewLikeModel.find({
        user: userId,
        review: { $in: reviewIds },
      });
      likedReviewIds = likes.map((l) => (l.review as any).toString());
    }

    const data = reviews.map((r) => {
      const isLiked = likedReviewIds.includes(r._id.toString());
      return {
        ...r.toObject(),
        is_liked: isLiked,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
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

  async getFeaturedReviews() {
    const moviesWithReviews = await this.movieModel
      .find({
        review_count: { $gt: 0 },
        is_active: true,
      })
      .sort({ rating: -1, review_count: -1 })
      .limit(6)
      .exec();

    const result: Array<{
      movie: Movie;
      rating_avg: number;
      review_count: number;
      reviews: Review[];
    }> = [];

    for (const movie of moviesWithReviews) {
      const reviews = await this.reviewModel
        .find({
          movie: movie._id,
          is_verified: true,
        })
        .populate('user', 'full_name avatar_url membershipRank')
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

  async getMoviesWithReviews(
    page: number = 1,
    limit: number = 12,
    sort: string = 'hot',
  ) {
    const skip = (page - 1) * limit;

    let sortOption: Record<string, SortOrder> = {
      review_count: -1,
      rating: -1,
    };
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

    const result: Array<{
      movie: Movie;
      rating_avg: number;
      review_count: number;
      reviews: Review[];
    }> = [];
    for (const movie of movies) {
      const reviews = await this.reviewModel
        .find({ movie: movie._id, is_verified: true })
        .populate('user', 'full_name avatar_url membershipRank')
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
      await this.reviewLikeModel.deleteOne({ _id: existingLike._id });
      await this.reviewModel.findByIdAndUpdate(reviewId, {
        $inc: { likes_count: -1 },
      });
      return { liked: false };
    } else {
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

  async updateReview(reviewId: string, userId: string, dto: CreateReviewDto) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if ((review.user as unknown as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền sửa đánh giá này');
    }

    review.rating = dto.rating;
    review.content = dto.content;
    await review.save();

    await this.updateMovieRating(
      (review.movie as unknown as Types.ObjectId).toString(),
    );

    return review;
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if ((review.user as unknown as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');
    }

    const movieId = (review.movie as unknown as Types.ObjectId).toString();

    await this.reviewLikeModel.deleteMany({ review: reviewId });
    await this.reviewModel.findByIdAndDelete(reviewId);

    await this.updateMovieRating(movieId);

    return { message: 'Đã xóa đánh giá thành công' };
  }

  async checkUserReview(userId: string, movieId: string) {
    const review = await this.reviewModel.findOne({
      user: userId,
      movie: movieId,
    });
    return { hasReviewed: !!review, review };
  }

  async checkUserHasTicket(userId: string, movieId: string) {
    const allShowtimes = await this.showtimeModel
      .find({ movie: movieId })
      .select('_id end_time');
    const allShowtimeIds = allShowtimes.map((st) => st._id);

    const now = new Date();
    const pastShowtimeIds = allShowtimes
      .filter((st) => st.end_time && new Date(st.end_time) <= now)
      .map((st) => st._id);

    const anyBooking = await this.bookingModel.findOne({
      user: userId,
      status: 'confirmed',
      showtime: { $in: allShowtimeIds },
    });

    const validBooking = await this.bookingModel.findOne({
      user: userId,
      status: 'confirmed',
      showtime: { $in: pastShowtimeIds },
    });

    let canReview = false;
    let message = '';

    if (validBooking) {
      canReview = true;
    } else if (anyBooking) {
      message =
        'Bạn chỉ có thể đánh giá sau khi đã xem xong phim (suất chiếu kết thúc).';
    } else {
      message = 'Bạn cần mua vé và thanh toán thành công để đánh giá phim này.';
    }

    return { hasTicket: !!anyBooking, canReview, message };
  }

  private async updateMovieRating(movieId: string) {
    const result = await this.reviewModel.aggregate<{
      avg_rating: number;
      count: number;
    }>([
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
