import { Injectable, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_GUEST_MAX,
  RATE_LIMIT_GUEST_TTL_MS,
  RATE_LIMIT_USER_MAX,
  RATE_LIMIT_USER_TTL_MS,
  FALLBACK_RATE_LIMITED,
} from '../../gemini/gemini.constants';

/**
 * Custom rate limit guard cho chatbot endpoint.
 * Phân biệt giới hạn:
 * - Guest (không có auth header): 10 request/phút
 * - User đã login (có auth header): 30 request/phút
 */
@Injectable()
export class ChatbotThrottleGuard extends ThrottlerGuard {
  private readonly customLogger = new Logger(ChatbotThrottleGuard.name);

  /** Tracker key: dùng IP + auth status */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const authHeader = req.headers?.['authorization'];
    const prefix = authHeader ? 'user' : 'guest';
    return `chatbot:${prefix}:${ip}`;
  }

  /** Override để kiểm tra rate limit theo auth status */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.['authorization'];
    const isAuthenticated = !!authHeader;

    const limit = isAuthenticated ? RATE_LIMIT_USER_MAX : RATE_LIMIT_GUEST_MAX;
    const ttl = isAuthenticated ? RATE_LIMIT_USER_TTL_MS : RATE_LIMIT_GUEST_TTL_MS;

    // Lấy tracker key
    const tracker = await this.getTracker(req);

    // Lấy throttler storage từ parent
    const storageService = (this as any).storageService as ThrottlerStorage;
    if (!storageService) {
      // Nếu không có storage, fallback về parent behavior
      return super.canActivate(context);
    }

    try {
      const result = await storageService.increment(tracker, ttl, limit, 0, 'default');

      if (result.totalHits > limit) {
        this.customLogger.warn(
          `🚫 Rate limited | tracker=${tracker} | hits=${result.totalHits}/${limit} | ttl=${ttl}ms`,
        );

        throw new HttpException(
          {
            success: false,
            reply: FALLBACK_RATE_LIMITED,
            source: 'rule',
            errorCode: 'RATE_LIMITED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.customLogger.debug(
        `✅ Rate check | tracker=${tracker} | hits=${result.totalHits}/${limit}`,
      );

      return true;
    } catch (error) {
      // Nếu là HttpException của chúng ta, re-throw
      if (error instanceof HttpException) {
        throw error;
      }
      // Lỗi khác (storage lỗi, etc.) → cho qua để không block user
      this.customLogger.error(`❌ Rate limit check failed: ${error}`);
      return true;
    }
  }
}
