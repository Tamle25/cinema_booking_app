import { IsNotEmpty, IsString, IsMongoId, IsNumber } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsMongoId()
  cinema_id: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsNumber()
  rows: number;

  @IsNotEmpty()
  @IsNumber()
  columns: number;
}
