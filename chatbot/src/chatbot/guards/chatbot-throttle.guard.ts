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

@Injectable()
export class ChatbotThrottleGuard extends ThrottlerGuard {
  private readonly customLogger = new Logger(ChatbotThrottleGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const authHeader = req.headers?.['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload._id || payload.id || payload.sub;
        if (userId) {
          return `chatbot:user:${userId}`;
        }
      } catch (err: any) {
        this.customLogger.warn(`Failed to decode JWT token for rate limiting: ${err.message}`);
      }
    }
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return `chatbot:guest:${ip}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.['authorization'];
    const isAuthenticated = !!authHeader;

    const limit = isAuthenticated ? RATE_LIMIT_USER_MAX : RATE_LIMIT_GUEST_MAX;
    const ttl = isAuthenticated ? RATE_LIMIT_USER_TTL_MS : RATE_LIMIT_GUEST_TTL_MS;

    const tracker = await this.getTracker(req);

    const storageService = (this as any).storageService as ThrottlerStorage;
    if (!storageService) {
      return super.canActivate(context);
    }

    try {
      const result = await storageService.increment(tracker, ttl, limit, 0, 'default');

      if (result.totalHits > limit) {
        this.customLogger.warn(
          `Rate limited | tracker=${tracker} | hits=${result.totalHits}/${limit} | ttl=${ttl}ms`,
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

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.customLogger.error(`Rate limit check failed: ${error}`);
      return true;
    }
  }
}
