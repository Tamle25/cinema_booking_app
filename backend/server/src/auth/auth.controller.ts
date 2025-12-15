import { Body, Controller, Post, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    // Nhận username và password từ body request
    return this.authService.signIn(signInDto.username, signInDto.password);
  }
  
  @UseGuards(AuthGuard('jwt')) // <--- "Ổ khóa": Bắt buộc phải có Token
  @Get('profile')
  getProfile(@Request() req) {
    // Trả về thông tin user lấy được từ token
    return req.user;
  }
}