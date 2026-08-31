import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EntitlementService {
  constructor(private prisma: PrismaService) {}

  /**
   * Evaluates if the organization has access to the feature and hasn't exceeded the quota.
   * Throws ForbiddenException (QUOTA_EXCEEDED) if limits are breached.
   */
  async enforceQuota(organizationId: string, feature: 'maxTransactions' | 'maxApiKeys'): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException({
        error: { code: 'SUBSCRIPTION_REQUIRED', message: 'An active subscription is required to perform this action.' }
      });
    }

    const limit = subscription.plan[feature];
    if (limit === -1) return; // Unlimited

    // Calculate current usage for the current billing period
    const currentUsage = await this.prisma.usageRecord.aggregate({
      where: {
        organizationId,
        feature,
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) // Naive 30 days for now
        }
      },
      _sum: {
        quantity: true
      }
    });

    const totalUsed = currentUsage._sum.quantity || 0;

    if (totalUsed >= limit) {
      throw new ForbiddenException({
        error: { 
          code: 'QUOTA_EXCEEDED', 
          message: `${feature} quota exceeded. Limit is ${limit}.`,
          currentUsage: totalUsed,
          limit,
        }
      });
    }
  }
}
