import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  frontendUrl: string;
  rawPassLength: number;
  normalizedPassLength: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly mailConfig: MailConfig;

  constructor(private readonly configService: ConfigService) {
    this.mailConfig = this.getMailConfig();
    this.logSafeMailConfig();
    this.transporter = nodemailer.createTransport({
      host: this.mailConfig.host,
      port: this.mailConfig.port,
      secure: this.mailConfig.secure,
      auth: {
        user: this.mailConfig.user,
        pass: this.mailConfig.pass,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      void this.verifyTransporter();
    }
  }

  async sendEmailVerification(
    email: string,
    token: string,
    name: string,
  ): Promise<void> {
    const verificationUrl = this.buildFrontendUrl('/verify-email', token);
    const safeName = this.escapeHtml(name);

    await this.sendMail({
      to: email,
      subject: '[Cinema Booking] Xác thực tài khoản của bạn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #e50914; text-align: center; font-size: 24px; margin-bottom: 20px;">Xác thực tài khoản Cinema Booking</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #333333;">Xin chào <strong>${safeName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333333;">Cảm ơn bạn đã đăng ký tài khoản tại Cinema Booking. Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản của bạn. Liên kết này có hiệu lực trong vòng 24 giờ kể từ khi được gửi.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #e50914; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Kích hoạt tài khoản</a>
          </div>
          <p style="font-size: 14px; color: #666666;">Nếu nút trên không hoạt động, bạn hãy sao chép liên kết dưới đây và dán vào thanh địa chỉ của trình duyệt:</p>
          <p style="word-break: break-all; color: #0066cc; font-size: 14px; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
          <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999999; text-align: center;">Đây là email tự động từ hệ thống Cinema Booking, vui lòng không trả lời trực tiếp email này.</p>
        </div>
      `,
      text: [
        `Xin chào ${name},`,
        '',
        'Cảm ơn bạn đã đăng ký tài khoản tại Cinema Booking.',
        'Vui lòng truy cập liên kết sau để xác thực tài khoản:',
        verificationUrl,
        '',
        'Liên kết này có hiệu lực trong vòng 24 giờ.',
      ].join('\n'),
    });
  }

  async sendResetPassword(
    email: string,
    token: string,
    name: string,
  ): Promise<void> {
    const resetUrl = this.buildFrontendUrl('/reset-password', token);
    const safeName = this.escapeHtml(name);

    await this.sendMail({
      to: email,
      subject: '[Cinema Booking] Yêu cầu đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #e50914; text-align: center; font-size: 24px; margin-bottom: 20px;">Đặt lại mật khẩu</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #333333;">Xin chào <strong>${safeName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333333;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới. Liên kết này có hiệu lực trong vòng 1 giờ kể từ khi được gửi.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #e50914; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Đặt lại mật khẩu</a>
          </div>
          <p style="font-size: 14px; color: #666666;">Nếu bạn không có yêu cầu này, vui lòng bỏ qua email này. Mật khẩu của bạn vẫn được giữ nguyên.</p>
          <p style="font-size: 14px; color: #666666;">Nếu nút trên không hoạt động, bạn hãy sao chép liên kết dưới đây và dán vào thanh địa chỉ của trình duyệt:</p>
          <p style="word-break: break-all; color: #0066cc; font-size: 14px; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999999; text-align: center;">Đây là email tự động từ hệ thống Cinema Booking, vui lòng không trả lời trực tiếp email này.</p>
        </div>
      `,
      text: [
        `Xin chào ${name},`,
        '',
        'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.',
        'Vui lòng truy cập liên kết sau để đặt lại mật khẩu mới:',
        resetUrl,
        '',
        'Liên kết này có hiệu lực trong vòng 1 giờ.',
      ].join('\n'),
    });
  }

  private getMailConfig(): MailConfig {
    const host = this.getRequiredConfig('MAIL_HOST');
    const portRaw = this.getRequiredConfig('MAIL_PORT');
    const user = this.getRequiredConfig('MAIL_USER');
    const rawPass = this.getRequiredConfig('MAIL_PASS');
    const pass = this.normalizeGmailAppPassword(rawPass);
    const from = this.getRequiredConfig('MAIL_FROM');
    const frontendUrl = this.getRequiredConfig('FRONTEND_URL');
    const port = Number(portRaw);
    const secure = port === 465;

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('MAIL_PORT must be a valid number.');
    }

    if (host !== 'smtp.gmail.com' || ![465, 587].includes(port)) {
      this.logger.warn(
        'Gmail SMTP is expected to use MAIL_HOST=smtp.gmail.com and MAIL_PORT=587 or 465.',
      );
    }

    if (rawPass.length !== 16) {
      this.logger.warn(
        `MAIL_PASS_LENGTH is ${rawPass.length}. Gmail App Passwords are usually 16 characters; check .env format and App Password value.`,
      );
    }

    if (this.hasMarkdownLink(user) || this.hasMarkdownLink(from)) {
      throw new Error(
        'MAIL_USER/MAIL_FROM must be plain email values, not Markdown links. Example: MAIL_FROM="Cinema Booking" <your_email@gmail.com>',
      );
    }

    if (this.hasMarkdownLink(frontendUrl)) {
      throw new Error(
        'FRONTEND_URL must be a plain URL. Example: FRONTEND_URL=http://localhost:3000',
      );
    }

    try {
      new URL(frontendUrl);
    } catch {
      throw new Error('FRONTEND_URL must be a valid absolute URL.');
    }

    return {
      host,
      port,
      secure,
      user,
      pass,
      from,
      frontendUrl,
      rawPassLength: rawPass.length,
      normalizedPassLength: pass.length,
    };
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
  }

  private hasMarkdownLink(value: string): boolean {
    return /\[[^\]]+\]\([^)]+\)/.test(value);
  }

  private normalizeGmailAppPassword(value: string): string {
    return value.replace(/\s/g, '');
  }

  private logSafeMailConfig(): void {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    this.logger.log('[mail-debug] Mail environment loaded for development.');
    this.logger.log(`[mail-debug] MAIL_HOST=${this.mailConfig.host}`);
    this.logger.log(`[mail-debug] MAIL_PORT=${this.mailConfig.port}`);
    this.logger.log(`[mail-debug] MAIL_SECURE=${this.mailConfig.secure}`);
    this.logger.log(`[mail-debug] MAIL_USER=${this.mailConfig.user}`);
    this.logger.log(`[mail-debug] MAIL_FROM=${this.mailConfig.from}`);
    this.logger.log('[mail-debug] MAIL_PASS_EXISTS=true');
    this.logger.log(
      `[mail-debug] MAIL_PASS_LENGTH=${this.mailConfig.rawPassLength}`,
    );

    if (
      this.mailConfig.normalizedPassLength !== this.mailConfig.rawPassLength
    ) {
      this.logger.log(
        `[mail-debug] MAIL_PASS_NORMALIZED_LENGTH=${this.mailConfig.normalizedPassLength}`,
      );
    }
  }

  private buildFrontendUrl(pathname: string, token: string): string {
    const url = new URL(this.mailConfig.frontendUrl);
    url.pathname = pathname;
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP transporter verified successfully.');
    } catch (error) {
      this.logger.error(this.getSafeMailErrorMessage(error));
    }
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.mailConfig.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      const message = this.getSafeMailErrorMessage(error);
      this.logger.error(message);
      throw new Error(message);
    }
  }

  private getSafeMailErrorMessage(error: unknown): string {
    const mailError = error as {
      code?: string;
      command?: string;
      responseCode?: number;
      message?: string;
    };

    if (
      mailError.code === 'EAUTH' ||
      mailError.responseCode === 534 ||
      mailError.responseCode === 535
    ) {
      return 'SMTP authentication failed. Check MAIL_USER, Gmail App Password, and that 2-Step Verification is enabled.';
    }

    if (
      mailError.code === 'ETIMEDOUT' ||
      mailError.code === 'ECONNECTION' ||
      mailError.code === 'ESOCKET' ||
      mailError.code === 'EDNS'
    ) {
      return 'SMTP connection failed or timed out. Check network access, MAIL_HOST, and MAIL_PORT.';
    }

    if (mailError.command) {
      return `SMTP error while running ${mailError.command}. Check mail configuration.`;
    }

    return mailError.message || 'Unable to send email due to an SMTP error.';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
