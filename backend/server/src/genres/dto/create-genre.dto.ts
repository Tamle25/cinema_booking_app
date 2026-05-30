import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateGenreDto {
  @IsNotEmpty({ message: 'Tên thể loại không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
