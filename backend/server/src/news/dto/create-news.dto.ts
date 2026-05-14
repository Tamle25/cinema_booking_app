import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNewsDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  shortDescription: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
