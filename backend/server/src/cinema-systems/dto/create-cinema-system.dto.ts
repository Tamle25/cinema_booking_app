import { IsNotEmpty, IsString, IsUrl, IsOptional } from 'class-validator';

export class CreateCinemaSystemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsUrl()
  logo_url: string;

  @IsOptional()
  @IsString()
  color_code?: string;
}
