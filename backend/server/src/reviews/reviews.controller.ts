import {
  Controller,
  Get,
  Post,
  Patch,
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

  @Get('featured')
  getFeaturedReviews() {
    return this.reviewsService.getFeaturedReviews();
  }

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

  @Get(':movieId')
  getMovieReviews(
    @Param('movieId') movieId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sort') sort: string = 'newest',
    @Request() req: any,
  ) {
    const authHeader = req.headers.authorization;
    let token: string | undefined = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    return this.reviewsService.getMovieReviews(
      movieId,
      Number(page) || 1,
      Number(limit) || 10,
      sort,
      token,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  createReview(@Body() dto: CreateReviewDto, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.createReview(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.toggleLike(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  deleteReview(@Param('id') id: string, @Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.deleteReview(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  updateReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    const userId = req.user._id || req.user.id;
    return this.reviewsService.updateReview(id, userId, dto);
  }
}
