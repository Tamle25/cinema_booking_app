import {
  IsOptional,
  IsMongoId,
  IsDateString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class UpdateShowtimeDto {
  @IsOptional()
  @IsMongoId()
  movie_id?: string;

  @IsOptional()
  @IsMongoId()
  cinema_id?: string;

  @IsOptional()
  @IsMongoId()
  room_id?: string;

  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
