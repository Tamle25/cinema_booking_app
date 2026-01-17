import { IsNotEmpty, IsString, IsMongoId, IsNumber } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  name: string; // "Phòng 01"

  @IsNotEmpty()
  @IsMongoId()
  cinema_id: string; // ID rạp (Phải là ID thật từ MongoDB)

  @IsNotEmpty()
  @IsString()
  type: string; // "2D"

  @IsNotEmpty()
  @IsNumber()
  rows: number; // 10

  @IsNotEmpty()
  @IsNumber()
  columns: number; // 12
}