import { IsNotEmpty, IsMongoId, IsDateString, IsNumber } from 'class-validator';

export class CreateShowtimeDto {
  @IsNotEmpty()
  @IsMongoId()
  movie_id: string;

  @IsNotEmpty()
  @IsMongoId()
  cinema_id: string;

  @IsNotEmpty()
  @IsMongoId()
  room_id: string;

  @IsNotEmpty()
  @IsDateString()
  start_time: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}
