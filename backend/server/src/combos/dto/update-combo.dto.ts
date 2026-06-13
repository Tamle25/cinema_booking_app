import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateComboDto {
  @IsOptional()
  @IsString()
  cinema_system_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  image_public_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(['combo', 'drink', 'snack'])
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_popular?: boolean;
}
