import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  private generateToken(): { plainToken: string; hashedToken: string } {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    return { plainToken, hashedToken };
  }

  async signUp(
    full_name: string,
    email: string,
    pass: string,
  ): Promise<Record<string, unknown>> {
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(pass, salt);
    
    const { plainToken, hashedToken } = this.generateToken();

    try {
      const user = await this.usersService.create({
        full_name,
        email,
        password: hashPassword,
        isEmailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 giờ
        emailVerificationLastSent: new Date(),
      });
      const userDoc = user as UserDocument;

      // Gửi email xác thực tài khoản
      try {
        await this.mailService.sendEmailVerification(email, plainToken, full_name);
      } catch (mailError) {
        console.error('Lỗi khi gửi email xác thực đăng ký:', mailError);
        // Rollback: Xóa tài khoản vừa tạo trong database
        await this.usersService.deleteById(userDoc._id.toString());
        throw new BadRequestException(
          'Đăng ký thất bại do không thể gửi email xác thực. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.',
        );
      }

      const userObject = userDoc.toObject() as unknown as Record<string, unknown>;
      delete userObject.password;
      return userObject;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const dbError = error as { code?: number };
      if (dbError?.code === 11000) {
        throw new ConflictException('Email này đã được sử dụng.');
      }
      throw error;
    }
  }

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(email);
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // Kiểm tra tài khoản đã xác thực email chưa
    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email chưa được xác thực. Vui lòng xác thực tài khoản trước khi đăng nhập.');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async verifyEmail(plainToken: string): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const user = await this.usersService.findByVerificationToken(hashedToken);
    
    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã được sử dụng.');
    }
    
    if (user.emailVerificationExpires && user.emailVerificationExpires.getTime() < Date.now()) {
      throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.');
    }
    
    await this.usersService.verifyEmail(user._id.toString());
    
    return {
      message: 'Xác thực tài khoản thành công! Bây giờ bạn có thể đăng nhập.',
    };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(email);
    
    // Response an toàn tránh lộ thông tin người dùng
    const safeResponse = {
      message: 'Nếu email tồn tại và chưa được kích hoạt, chúng tôi đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.',
    };

    if (!user) {
      return safeResponse;
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Tài khoản này đã được xác thực trước đó. Vui lòng đăng nhập.');
    }

    // Đọc cooldown từ config
    const cooldownSeconds = parseInt(
      this.configService.get<string>('RESEND_EMAIL_COOLDOWN_SECONDS', '60'),
      10,
    );

    // Kiểm tra Cooldown chống spam
    if (user.emailVerificationLastSent) {
      const timePassed = Date.now() - new Date(user.emailVerificationLastSent).getTime();
      const cooldownMs = cooldownSeconds * 1000;
      if (timePassed < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
        throw new BadRequestException(`Vui lòng đợi ${secondsLeft} giây trước khi yêu cầu gửi lại email.`);
      }
    }

    const { plainToken, hashedToken } = this.generateToken();

    await this.usersService.updateVerificationToken(user._id.toString(), {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // Hạn 24 giờ
      emailVerificationLastSent: new Date(),
    });

    try {
      await this.mailService.sendEmailVerification(user.email, plainToken, user.full_name);
    } catch (error) {
      console.error('Lỗi khi gửi lại mail xác thực:', error);
      throw new BadRequestException('Gửi email thất bại. Vui lòng thử lại sau.');
    }

    return safeResponse;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(email);
    const successResponse = {
      message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
    };

    if (!user) {
      return successResponse;
    }

    // Đọc cooldown từ config
    const cooldownSeconds = parseInt(
      this.configService.get<string>('RESEND_EMAIL_COOLDOWN_SECONDS', '60'),
      10,
    );

    // Cooldown chống spam
    if (user.resetPasswordLastSent) {
      const timePassed = Date.now() - new Date(user.resetPasswordLastSent).getTime();
      const cooldownMs = cooldownSeconds * 1000;
      if (timePassed < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
        throw new BadRequestException(`Vui lòng đợi ${secondsLeft} giây trước khi yêu cầu đặt lại mật khẩu.`);
      }
    }

    const { plainToken, hashedToken } = this.generateToken();

    await this.usersService.updateResetToken(user._id.toString(), {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: new Date(Date.now() + 1 * 60 * 60 * 1000), // Hết hạn trong 1h
      resetPasswordLastSent: new Date(),
    });

    try {
      await this.mailService.sendResetPassword(user.email, plainToken, user.full_name);
    } catch (error) {
      console.error('Lỗi khi gửi mail reset password:', error);
      throw new BadRequestException('Gửi email đặt lại mật khẩu thất bại. Vui lòng thử lại sau.');
    }

    return successResponse;
  }

  async resetPassword(
    plainToken: string,
    pass: string,
  ): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ.');
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires.getTime() < Date.now()) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu lại.');
    }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(pass, salt);

    await this.usersService.updatePassword(user._id.toString(), hashPassword);
    await this.usersService.clearResetToken(user._id.toString());

    return {
      message: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }
}
