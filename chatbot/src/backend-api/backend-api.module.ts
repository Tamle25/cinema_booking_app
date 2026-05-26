import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BackendApiService } from './backend-api.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  providers: [BackendApiService],
  exports: [BackendApiService],
})
export class BackendApiModule {}
