import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Analytics')
@ApiSecurity('ApiKey')
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve aggregated metrics overview' })
  @ApiQuery({ name: 'period', required: false, enum: ['DAILY', 'MONTHLY'], description: 'Aggregation period. Defaults to DAILY' })
  @ApiResponse({ status: 200, description: 'Returns aggregated analytics overview.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverview(@Request() req: any, @Query('period') period: string = 'DAILY') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const aggregates = await this.prisma.analyticsAggregate.findMany({
      where: {
        organizationId: req.organizationId,
        period: period.toUpperCase(),
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    // Format for charting: group by metric, then return time-series data
    const formatted = aggregates.reduce((acc: any, row: any) => {
      if (!acc[row.metric]) {
        acc[row.metric] = [];
      }
      acc[row.metric].push({
        date: row.date,
        value: Number(row.value) // convert BigInt for JSON serialization
      });
      return acc;
    }, {});

    return { data: formatted };
  }

  @Get('transactions')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve transaction analytics' })
  async getTransactionsAnalytics(@Request() req: any, @Query('period') period: string = 'DAILY') {
    return this.getMetricData(req.organizationId, 'total_transactions', period);
  }

  @Get('verifications')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve verification analytics' })
  async getVerificationsAnalytics(@Request() req: any, @Query('period') period: string = 'DAILY') {
    return this.getMetricData(req.organizationId, 'total_verifications', period);
  }

  @Get('api-usage')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve API usage analytics' })
  async getApiUsageAnalytics(@Request() req: any, @Query('period') period: string = 'DAILY') {
    return this.getMetricData(req.organizationId, 'api_requests', period);
  }

  private async getMetricData(organizationId: string, metric: string, period: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const aggregates = await this.prisma.analyticsAggregate.findMany({
      where: {
        organizationId,
        metric,
        period: period.toUpperCase(),
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    const formatted = aggregates.map(row => ({
      date: row.date,
      value: Number(row.value)
    }));

    return { data: formatted };
  }
}
