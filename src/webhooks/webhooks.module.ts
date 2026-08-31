import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookWorkerService } from './webhook-worker.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookWorkerService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
