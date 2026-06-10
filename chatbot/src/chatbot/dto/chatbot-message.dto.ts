import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChatbotMessageDto {
  @IsString({ message: 'conversationId phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Thiếu conversationId.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  conversationId: string;

  @IsString({ message: 'Tin nhắn phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Bạn vui lòng nhập nội dung cần hỗ trợ.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  isAuthenticated?: boolean;
}
