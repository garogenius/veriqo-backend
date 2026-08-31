import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxEvent } from '@prisma/client';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer: NodeJS.Timeout;
  private isProcessing = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Poll the outbox every 5 seconds
    this.timer = setInterval(() => this.processOutbox(), 5000);
    this.logger.log('Outbox Relay Worker started.');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async processOutbox() {
    // Prevent overlapping runs
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find up to 50 pending events
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });

      if (events.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.log(`Processing ${events.length} outbox events...`);

      for (const event of events) {
        await this.dispatch(event);
      }
    } catch (error) {
      this.logger.error('Error polling outbox events', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatch(event: OutboxEvent) {
    try {
      // Here you would typically publish the event to an SQS queue, Kafka, or EventBridge.
      // For this implementation, we will act as the consumer and route to domain services directly.
      
      this.logger.debug(`Dispatching event: ${event.eventType} (ID: ${event.id})`);
      
      // Simulate successful dispatch
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { 
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to dispatch event ${event.id}`, error);
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { 
          status: 'FAILED',
          error: error.message,
        },
      });
    }
  }
}
