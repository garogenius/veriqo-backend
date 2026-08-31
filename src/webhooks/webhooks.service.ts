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

  // Example method that would be called internally by other services (or a worker)
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
        this.dispatchWebhook(endpoint, eventName, payload);
      }
    }
  }

  private dispatchWebhook(endpoint: any, eventName: string, payload: any) {
    // In production, this pushes to a queue (e.g. BullMQ) for retry and exponential backoff
    const timestamp = Date.now().toString();
    const eventId = `evt_${randomBytes(12).toString('hex')}`;
    
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = createHmac('sha256', endpoint.secret).update(signaturePayload).digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'X-VERIQO-Event-ID': eventId,
      'X-VERIQO-Timestamp': timestamp,
      'X-VERIQO-Signature': signature
    };

    // Simulated fetch call
    console.log(`[Webhook Dispatch] Sending ${eventName} to ${endpoint.url} with signature ${signature}`);
  }
}
