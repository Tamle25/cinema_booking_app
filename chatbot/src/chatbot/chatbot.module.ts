import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { GeminiModule } from '../gemini/gemini.module';
import { BackendApiModule } from '../backend-api/backend-api.module';
import { IntentModule } from '../intent/intent.module';

@Module({
  imports: [GeminiModule, BackendApiModule, IntentModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
