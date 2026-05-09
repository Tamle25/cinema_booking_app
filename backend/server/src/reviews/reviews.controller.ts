import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /reviews/featured — Reviews nổi bật (trang chủ)
  @Get('featured')
  getFeaturedReviews() {
    return this.reviewsService.getFeaturedReviews();
  }

  // GET /reviews/movies — Danh sách phim có review (trang /reviews)
  @Get('movies')
  getMoviesWithReviews(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
    @Query('sort') sort: string = 'hot',
  ) {
    return this.reviewsService.getMoviesWithReviews(
      Number(page) || 1,
      Number(limit) || 12,
      sort,
    );
  }

  // GET /reviews/check/:movieId — Kiểm tra user đã review/mua vé chưa
  @UseGuards(AuthGuard('jwt'))
  @Get('check/:movieId')
  async checkReviewStatus(
    @Param('movieId') movieId: string,
    @Request() req: any,
  ) {
    const userId = req.user._id || req.user.id;
    const [reviewStatus, ticketStatus] = await Promise.all([
      this.reviewsService.checkUserReview(userId, movieId),
      this.reviewsService.checkUserHasTicket(userId, movieId),
    ]);
    return { ...reviewStatus, ...ticketStatus };
  }

  // GET /reviews/:movieId — Reviews theo phim (paginated)
  @Get(':movieId')
  getMovieReviews(
    @Param('movieId') movieId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sort') sort: string = 'newest',
  ) {
    return this.reviewsService.getMovieReviews(
      movieId,
      Number(page) || 1,
      Number(limit) || 10,
      sort,
    );
  }

  // POST /reviews — Tạo review (cần đăng nhập)
  @UseGuards(AuthGuard('jwt'))
  @Post()
  createReview(@Body() dto: CreateReviewDto, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.createReview(userId, dto);
  }

  // POST /reviews/:id/like — Like/Unlike review (cần đăng nhập)
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.toggleLike(id, userId);
  }

  // DELETE /reviews/:id — Xóa review (chỉ chính chủ)
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  deleteReview(@Param('id') id: string, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.deleteReview(id, userId);
  }
}
