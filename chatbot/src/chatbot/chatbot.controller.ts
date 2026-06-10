import { Controller, Post, Body, Headers, Logger, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ChatbotService } from './chatbot.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';
import { ChatbotResponse } from './types/chatbot.types';
import { ChatbotThrottleGuard } from './guards/chatbot-throttle.guard';

@Controller('api/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @SkipThrottle()
  @UseGuards(ChatbotThrottleGuard)
  async handleMessage(
    @Body() dto: ChatbotMessageDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<ChatbotResponse> {
    this.logger.log(`📨 POST /api/chatbot/message | msg="${dto.message?.substring(0, 50)}..." | auth=${!!authHeader}`);

    const result = await this.chatbotService.processMessage(dto, authHeader);

    this.logger.log(
      `📤 Response: success=${result.success} | source=${result.source} | ` +
      `${result.model ? 'model=' + result.model + ' | ' : ''}` +
      `${result.errorCode ? 'errorCode=' + result.errorCode + ' | ' : ''}` +
      `reply=${result.reply?.substring(0, 60)}...`,
    );
    return result;
  }
}
