import { Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { UsageService } from './usage.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [EntitlementService, UsageService],
  exports: [EntitlementService, UsageService],
})
export class SubscriptionsModule {}
