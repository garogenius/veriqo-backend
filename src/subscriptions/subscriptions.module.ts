import { Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { UsageService } from './usage.service';
import { BillingService } from './billing.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [SubscriptionsController],
  providers: [EntitlementService, UsageService, BillingService],
  exports: [EntitlementService, UsageService, BillingService],
})
export class SubscriptionsModule {}
