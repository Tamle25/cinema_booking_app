import { IsString, IsMongoId, IsUrl, IsOptional } from 'class-validator';

export class UpdateCinemaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsMongoId()
  cinema_system_id?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsUrl()
  map_url?: string;
}
