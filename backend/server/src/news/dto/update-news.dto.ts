import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
