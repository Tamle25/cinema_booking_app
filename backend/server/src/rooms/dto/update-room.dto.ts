import {
  IsOptional,
  IsString,
  IsNumber,
  IsMongoId,
  IsBoolean,
  Min,
} from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsMongoId()
  cinema_id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rows?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  columns?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
