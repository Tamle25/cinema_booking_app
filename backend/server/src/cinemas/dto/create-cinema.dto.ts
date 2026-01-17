import { IsNotEmpty, IsString, IsMongoId, IsUrl, IsOptional } from 'class-validator';

export class CreateCinemaDto {
  @IsNotEmpty()
  @IsString()
  name: string; // VD: "Beta Mỹ Đình"

  @IsNotEmpty()
  @IsString()
  slug: string; // VD: "beta-my-dinh"

  @IsNotEmpty()
  @IsMongoId()
  cinema_system_id: string; // ID của hãng rạp (Beta, CGV...)

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  city: string; // Hà Nội, TP.HCM...

  @IsOptional()
  @IsUrl()
  map_url?: string;
}