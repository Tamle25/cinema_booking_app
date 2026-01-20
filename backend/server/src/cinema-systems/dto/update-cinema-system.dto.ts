import { IsString, IsUrl, IsOptional } from 'class-validator';

export class UpdateCinemaSystemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @IsOptional()
  @IsString()
  color_code?: string;
}
