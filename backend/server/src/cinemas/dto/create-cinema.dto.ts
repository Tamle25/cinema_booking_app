import { IsNotEmpty, IsString, IsMongoId, IsUrl, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCinemaDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsMongoId()
  cinema_system_id: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsOptional()
  @IsUrl()
  map_url?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
