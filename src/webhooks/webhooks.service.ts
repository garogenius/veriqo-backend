import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { randomBytes, createHmac } from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateWebhookDto) {
    // Generate a secure signing secret
    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    return this.prisma.webhookEndpoint.create({
      data: {
        organizationId,
        url: dto.url,
        events: dto.events,
        environment: dto.environment,
        secret,
      }
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId }
    });
  }

  // Publish event creates WebhookDelivery records for the worker to pick up
  async publishEvent(organizationId: string, environment: string, eventName: string, payload: any) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { 
        organizationId,
        environment: environment as any,
        status: 'ACTIVE'
      }
    });

    for (const endpoint of endpoints) {
      if (endpoint.events.includes(eventName) || endpoint.events.includes('*')) {
        await this.createDeliveryRecord(endpoint, eventName, payload);
      }
    }
  }

  private async createDeliveryRecord(endpoint: any, eventName: string, payload: any) {
    const eventId = `evt_${randomBytes(12).toString('hex')}`;
    
    // Store the raw payload inside the outbox/delivery, or assume the worker can reconstruct it.
    // For simplicity, we just log the delivery intent here. The worker will handle actual signature & HTTP post.
    await this.prisma.webhookDelivery.create({
      data: {
        webhookEndpointId: endpoint.id,
        eventId,
        payload,
        status: 'PENDING',
        attemptNumber: 1,
        nextRetryAt: new Date(), // Immediate
      }
    });
  }

  async rotateSecret(organizationId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id: endpointId }
    });

    if (!endpoint || endpoint.organizationId !== organizationId) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    const newSecret = `whsec_${randomBytes(24).toString('hex')}`;

    return this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { secret: newSecret }
    });
  }

  async sendTestEvent(organizationId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id: endpointId }
    });

    if (!endpoint || endpoint.organizationId !== organizationId) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    const testPayload = {
      id: `evt_test_${Date.now()}`,
      type: 'ping',
      created_at: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from VERIQO'
      }
    };

    await this.createDeliveryRecord(endpoint, 'ping', testPayload);
    return { success: true, message: 'Test event queued for delivery' };
  }
}
