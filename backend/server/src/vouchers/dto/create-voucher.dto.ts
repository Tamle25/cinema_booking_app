import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['ADMIN_CODE', 'POINT_EXCHANGE_TEMPLATE'])
  voucherType?: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['PERCENT', 'FIXED_AMOUNT'])
  discountType: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  discountValue: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  usageLimit?: number;

  @IsBoolean()
  @IsOptional()
  isUnlimited?: boolean;

  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableCinemaIds?: string[];

  @IsBoolean()
  @IsOptional()
  isAllCinemas?: boolean;

  @IsString()
  @IsOptional()
  @IsEnum(['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'])
  requiredMembershipRank?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  requiredPoints?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  validDaysAfterExchange?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  exchangeLimit?: number;
}
