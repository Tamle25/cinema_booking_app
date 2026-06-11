import {
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';

export class UpdateMovieDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  banner_url?: string;

  @IsOptional()
  @IsString()
  trailer_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  poster_url?: string;

  @IsOptional()
  @IsString()
  poster_public_id?: string;

  @IsOptional()
  @IsString()
  banner_public_id?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true, message: 'Mỗi thể loại phải là ObjectId hợp lệ' })
  genres?: string[];

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsDateString()
  release_date?: string;
}
