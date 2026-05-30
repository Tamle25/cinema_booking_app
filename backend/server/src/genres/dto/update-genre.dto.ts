import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateGenreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
