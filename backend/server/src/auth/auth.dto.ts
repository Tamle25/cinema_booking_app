// src/auth/auth.dto.ts
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Khuôn mẫu cho dữ liệu Đăng ký
export class RegisterDto {
  @IsNotEmpty()
  full_name: string;

  @IsEmail({}, { message: 'Email không hợp lệ' }) // Kiểm tra phải là email
  email: string;

  @MinLength(6, { message: 'Mật khẩu phải dài hơn 6 ký tự' }) // Kiểm tra độ dài
  password: string;
}

// Khuôn mẫu cho dữ liệu Đăng nhập
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}