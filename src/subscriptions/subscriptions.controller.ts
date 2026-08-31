import { Controller, Get, Post, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Billing & Subscriptions')
@ApiSecurity('ApiKey')
@Controller('v1/billing')
export class SubscriptionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('plan')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve the current active subscription plan for the organization' })
  @ApiResponse({ status: 200, description: 'Returns the active subscription plan details.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPlan(@Request() req: any) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: req.organizationId },
      include: { plan: true }
    });

    return {
      data: subscription || null
    };
  }

  @Get('usage')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve current API usage against plan limits' })
  @ApiResponse({ status: 200, description: 'Returns usage statistics for the current billing period.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsage(@Request() req: any) {
    // Basic aggregation of usage for the current month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = await this.prisma.usageRecord.groupBy({
      by: ['feature'],
      where: {
        organizationId: req.organizationId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { quantity: true }
    });

    const formattedUsage = usage.reduce((acc: any, item) => {
      acc[item.feature] = item._sum.quantity;
      return acc;
    }, {});

    return {
      data: formattedUsage
    };
  }

  @Post('subscribe/mock')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Mock endpoint to generate a STARTER subscription for testing limits' })
  @ApiResponse({ status: 201, description: 'Subscription created.' })
  async mockSubscribe(@Request() req: any) {
    // Find or create a generic STARTER plan
    let plan = await this.prisma.plan.findFirst({ where: { name: 'STARTER' }});
    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: 'STARTER',
          monthlyPrice: BigInt(12000),
          yearlyPrice: BigInt(120000),
          maxApiKeys: 3,
          maxTransactions: 100, // Strict limit for testing
          features: { "verify": true }
        }
      });
    }

    const sub = await this.prisma.subscription.upsert({
      where: { organizationId: req.organizationId },
      create: {
        organizationId: req.organizationId,
        planId: plan.id,
        status: 'ACTIVE',
        interval: 'MONTHLY',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      update: {
        planId: plan.id,
        status: 'ACTIVE'
      }
    });

    return { data: sub };
  }
}
