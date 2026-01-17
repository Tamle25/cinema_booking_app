import { IsNotEmpty, IsMongoId, IsArray } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsMongoId()
  showtime_id: string;

  @IsNotEmpty()
  @IsMongoId()
  user_id: string; 

  @IsNotEmpty()
  @IsArray()
  seats: string[];
}