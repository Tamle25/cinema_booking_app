// Bổ sung thêm IsOptional và IsBoolean vào dòng import
import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  slug: string; 

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

  @IsNotEmpty()
  @IsString()
  genre: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsDateString()
  release_date: string; 
}