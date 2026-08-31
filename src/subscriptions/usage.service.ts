import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Records a billable usage event idempotently.
   * Uses `idempotencyKey` to ensure retries do not count twice.
   */
  async recordUsage(organizationId: string, feature: string, idempotencyKey: string, quantity = 1): Promise<void> {
    try {
      await this.prisma.usageRecord.create({
        data: {
          organizationId,
          feature,
          quantity,
          idempotencyKey,
        }
      });
    } catch (error: any) {
      // Prisma error P2002 is Unique Constraint Violation
      if (error.code === 'P2002') {
        // Usage was already recorded for this idempotency key. Safely ignore.
        return;
      }
      throw error;
    }
  }
}
