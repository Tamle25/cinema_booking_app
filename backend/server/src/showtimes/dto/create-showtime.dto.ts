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
  start_time: string; // Dạng ISO: "2024-05-20T19:00:00.000Z"

  @IsNotEmpty()
  @IsNumber()
  price: number;
}