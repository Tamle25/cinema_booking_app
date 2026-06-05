import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  cinemaId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  orderAmount: number;
}
