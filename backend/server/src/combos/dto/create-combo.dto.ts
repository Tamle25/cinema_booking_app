import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';

export class CreateComboDto {
  @IsNotEmpty()
  @IsString()
  cinema_system_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  image_url?: string;

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
