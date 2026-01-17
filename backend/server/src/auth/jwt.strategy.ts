// src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // <--- Import ConfigService

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Inject ConfigService vào constructor
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Lấy secret từ .env thay vì hard-code string
      secretOrKey: configService.get<string>('JWT_SECRET')!, 
    });
  }

  async validate(payload: any) {
    // Trả về đầy đủ thông tin từ token payload
    return { 
      _id: payload.sub,    // ID gốc của user
      id: payload.sub,     // Alias cho frontend
      email: payload.email,
      role: payload.role,
      full_name: payload.full_name
    };
  }
}