import { Module } from '@nestjs/common';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [SubscriptionsModule, PrismaModule, ProvidersModule],
  controllers: [VerifyController],
  providers: [VerifyService],
})
export class VerifyModule {}
