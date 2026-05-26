import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODELS } from './gemini/gemini.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ===== STARTUP DIAGNOSTICS =====
  logger.log('🔧 === CHATBOT SERVICE STARTUP DIAGNOSTICS ===');

  const geminiKey = configService.get<string>('GEMINI_API_KEY');
  const geminiModel = configService.get<string>('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
  const geminiModels = configService.get<string>('GEMINI_MODELS') || DEFAULT_GEMINI_MODELS;
  const backendUrl = configService.get<string>('BACKEND_BASE_URL');
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN');

  // API Key check
  if (!geminiKey) {
    logger.error('❌ GEMINI_API_KEY: NOT SET — chatbot sẽ không hoạt động!');
  } else {
    const maskedKey = `${geminiKey.substring(0, 8)}...${geminiKey.substring(geminiKey.length - 4)}`;
    logger.log(`✅ GEMINI_API_KEY: SET (${geminiKey.length} chars, ${maskedKey})`);

    if (!geminiKey.startsWith('AIzaSy')) {
      logger.warn('⚠️ GEMINI_API_KEY format có thể không đúng (thường bắt đầu bằng "AIzaSy")');
    }
  }

  // Model config
  logger.log(`📌 GEMINI_MODEL (primary): ${geminiModel}`);
  logger.log(`📌 GEMINI_MODELS (chain): ${geminiModels}`);

  // Backend & Frontend
  logger.log(`📌 BACKEND_BASE_URL: ${backendUrl || '❌ NOT SET (using default: http://localhost:4000)'}`);
  logger.log(`📌 FRONTEND_ORIGIN: ${frontendOrigin || '❌ NOT SET (using default: http://localhost:3000)'}`);

  // CORS cho frontend
  app.enableCors({
    origin: frontendOrigin || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — không trả stack trace
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('PORT') || 5005;
  await app.listen(port);

  logger.log('🔧 ===================================');
  logger.log(`✅ Chatbot service đang chạy tại http://localhost:${port}`);
  logger.log(`✅ CORS origin: ${frontendOrigin || 'http://localhost:3000'}`);
  logger.log(`✅ Backend API: ${backendUrl || 'http://localhost:4000'}`);
  logger.log(`✅ Model chain: ${geminiModels}`);
  logger.log('🔧 ===================================');
}
bootstrap();
