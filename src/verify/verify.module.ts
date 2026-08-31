import { Module } from '@nestjs/common';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { MockProvider } from '../providers/mock.provider';

@Module({
  controllers: [VerifyController],
  providers: [VerifyService, MockProvider],
})
export class VerifyModule {}
