import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  full_name: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @MinLength(6, { message: 'Mật khẩu phải dài hơn 6 ký tự' })
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @MinLength(6, { message: 'Mật khẩu phải dài hơn 6 ký tự' })
  password: string;
}
