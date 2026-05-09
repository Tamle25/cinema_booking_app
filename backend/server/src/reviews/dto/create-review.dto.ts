import { IsNotEmpty, IsNumber, IsString, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'Vui lòng chọn phim để đánh giá' })
  @IsString()
  movie_id: string;

  @IsNotEmpty({ message: 'Vui lòng chọn điểm đánh giá' })
  @IsNumber()
  @Min(1, { message: 'Điểm đánh giá tối thiểu là 1' })
  @Max(10, { message: 'Điểm đánh giá tối đa là 10' })
  rating: number;

  @IsNotEmpty({ message: 'Vui lòng nhập nội dung đánh giá' })
  @IsString()
  @MinLength(10, { message: 'Nội dung đánh giá phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Nội dung đánh giá không được vượt quá 1000 ký tự' })
  content: string;
}
