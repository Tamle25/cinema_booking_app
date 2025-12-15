import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // <--- Import JwtService

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {} // <--- Inject JwtService

  async signIn(username: string, pass: string): Promise<any> {
    // 1. Kiểm tra user (Ở đây tôi hard-code ví dụ, sau này sẽ lấy từ Database)
    const user = { userId: 1, username: 'admin', password: '123456' };

    if (user.username !== username || user.password !== pass) {
      throw new UnauthorizedException(); // Báo lỗi nếu sai thông tin
    }

    // 2. Nếu đúng, tạo JWT Token
    const payload = { sub: user.userId, username: user.username };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}