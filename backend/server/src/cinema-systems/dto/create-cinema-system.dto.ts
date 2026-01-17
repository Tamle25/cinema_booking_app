import { IsNotEmpty, IsString, IsUrl, IsOptional } from 'class-validator';

export class CreateCinemaSystemDto {
  @IsNotEmpty()
  @IsString()
  name: string; // VD: "Beta Cinemas"

  @IsNotEmpty()
  @IsString()
  slug: string; // VD: "beta-cinemas"

  @IsNotEmpty()
  @IsUrl()
  logo_url: string;

  @IsOptional()
  @IsString()
  color_code?: string; // VD: "#0055d4" (Để tô màu giao diện theo hãng)
}