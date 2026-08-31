import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';
// import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WebhookWorkerService {
  private readonly logger = new Logger(WebhookWorkerService.name);
  private readonly MAX_ATTEMPTS = 5;

  constructor(private prisma: PrismaService) {}

  /**
   * Worker to process PENDING WebhookDeliveries with Exponential Backoff (Rule 167)
   * Runs frequently (e.g. every minute) to pick up eligible deliveries.
   */
  // @Cron(CronExpression.EVERY_MINUTE)
  async processWebhooks() {
    this.logger.debug('Polling for pending webhook deliveries...');
    
    const now = new Date();
    
    // Find deliveries that are PENDING or FAILED and are due for retry
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        nextRetryAt: { lte: now },
      },
      include: {
        endpoint: true
      },
      take: 50 // batch size
    });

    for (const delivery of deliveries) {
      await this.processDelivery(delivery);
    }
  }

  private async processDelivery(delivery: any) {
    try {
      this.logger.log(`Dispatching webhook event ${delivery.eventId} to ${delivery.endpoint.url}`);
      
      const payloadString = typeof delivery.payload === 'string' 
        ? delivery.payload 
        : JSON.stringify(delivery.payload);

      // Generate HMAC signature
      const signature = createHmac('sha256', delivery.endpoint.secret)
        .update(payloadString)
        .digest('hex');

      const headers = {
        'Content-Type': 'application/json',
        'x-veriqo-signature': signature,
        'x-veriqo-event-id': delivery.eventId,
      };

      // Simulate HTTP request to customer webhook endpoint
      // const response = await fetch(delivery.endpoint.url, { method: 'POST', body: payloadString, headers })
      
      const isSuccess = Math.random() > 0.5; // Randomly succeed or fail for mock purposes
      const httpStatus = isSuccess ? 200 : 500;
      const responseTime = Math.floor(Math.random() * 500) + 50;

      if (isSuccess) {
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SUCCEEDED',
            httpStatus,
            responseTime,
            nextRetryAt: null,
          }
        });
        this.logger.log(`Successfully delivered webhook ${delivery.eventId}`);
      } else {
        throw new Error(`Endpoint returned ${httpStatus}`);
      }

    } catch (error: any) {
      const nextAttempt = delivery.attemptNumber + 1;
      let status = 'FAILED';
      let nextRetryAt: Date | null = null;

      if (nextAttempt > this.MAX_ATTEMPTS) {
        status = 'DEAD_LETTER'; // Rule 196
        this.logger.error(`Webhook ${delivery.eventId} moved to DEAD_LETTER after ${this.MAX_ATTEMPTS} attempts`);
      } else {
        // Exponential backoff: e.g. 1m, 2m, 4m, 8m
        const backoffMinutes = Math.pow(2, nextAttempt - 1);
        nextRetryAt = new Date(Date.now() + backoffMinutes * 60000);
        this.logger.warn(`Webhook ${delivery.eventId} failed. Retrying at ${nextRetryAt.toISOString()}`);
      }

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          attemptNumber: nextAttempt,
          failureReason: error.message,
          nextRetryAt,
        }
      });
    }
  }
}
