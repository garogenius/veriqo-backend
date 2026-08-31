import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Background Aggregation Worker (Rule 145)
   * Runs daily at midnight to aggregate raw usage records into AnalyticsAggregate.
   */
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyUsage() {
    this.logger.log('Starting daily usage aggregation...');
    
    // In a real scenario, you would fetch distinct organizations and metrics
    // For this demonstration, we query UsageRecords grouped by organizationId and feature
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const usages = await this.prisma.usageRecord.groupBy({
      by: ['organizationId', 'feature'],
      where: {
        createdAt: {
          gte: yesterday,
          lte: endOfYesterday,
        }
      },
      _sum: {
        quantity: true
      }
    });

    for (const usage of usages) {
      if (usage._sum.quantity !== null) {
        await this.prisma.analyticsAggregate.upsert({
          where: {
            organizationId_metric_period_date: {
              organizationId: usage.organizationId,
              metric: usage.feature,
              period: 'DAILY',
              date: yesterday,
            }
          },
          create: {
            organizationId: usage.organizationId,
            metric: usage.feature,
            period: 'DAILY',
            date: yesterday,
            value: BigInt(usage._sum.quantity),
          },
          update: {
            value: BigInt(usage._sum.quantity),
          }
        });
      }
    }

    this.logger.log(`Aggregated ${usages.length} metrics.`);
  }
}
