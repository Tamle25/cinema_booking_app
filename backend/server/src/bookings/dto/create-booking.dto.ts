import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsMongoId()
  showtime_id: string;

  @IsNotEmpty()
  @IsMongoId()
  user_id: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seats: string[];
}
