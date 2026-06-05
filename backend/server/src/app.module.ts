import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoviesModule } from './movies/movies.module';
import { ShowtimesModule } from './showtimes/showtimes.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { BookingsModule } from './bookings/bookings.module';
import { CinemaSystemsModule } from './cinema-systems/cinema-systems.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { PaymentsModule } from './payments/payments.module';
import { CombosModule } from './combos/combos.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NewsModule } from './news/news.module';
import { GenresModule } from './genres/genres.module';
import { UploadsModule } from './uploads/uploads.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { VouchersModule } from './vouchers/vouchers.module';

@Module({
  imports: [
    // 1. Cấu hình để đọc file .env (isGlobal để dùng được ở mọi nơi)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), join(__dirname, '..', '.env')],
    }),

    // 2. Kết nối MongoDB kiểu Async (đợi đọc xong .env mới kết nối)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    // 3. Serve static files (uploads)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    MoviesModule,
    ShowtimesModule,
    CinemasModule,
    CinemaSystemsModule,
    BookingsModule,
    AuthModule,
    RoomsModule,
    PaymentsModule,
    CombosModule,
    ReviewsModule,
    NewsModule,
    GenresModule,
    UploadsModule,
    LoyaltyModule,
    VouchersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
