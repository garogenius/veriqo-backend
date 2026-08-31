import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEventParams {
  type: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  payload: any;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches an event to the transactional outbox.
   */
  async dispatch(params: CreateEventParams) {
    return this.prisma.outboxEvent.create({
      data: {
        eventType: params.type,
        organizationId: params.organizationId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        payload: params.payload,
        status: 'PENDING',
        attempts: 0,
      }
    });
  }
}
