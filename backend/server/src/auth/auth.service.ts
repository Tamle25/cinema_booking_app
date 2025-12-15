import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service'; 
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, 
    private jwtService: JwtService
  ) {}

  // --- Hàm Đăng ký mới ---
  async signUp(full_name: string, email: string, pass: string): Promise<any> {
    // Mã hóa mật khẩu (Hashing)
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(pass, salt);
    const user = await this.usersService.create({ 
      full_name,
      email,
      password: hashPassword 
    });
    return user;
  }

  async signIn(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    //  So sánh mật khẩu: Dùng bcrypt.compare để so sánh
    // (pass: mật khẩu người dùng nhập, user.password: mật khẩu đã mã hóa trong DB)
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException();
    }
    const payload = { sub: (user as any)._id, email: user.email, role: user.role };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}