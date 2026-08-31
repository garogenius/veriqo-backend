import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

@ApiTags('Billing & Subscriptions')
@ApiSecurity('ApiKey')
@Controller('v1/billing')
export class SubscriptionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all available billing plans' })
  @ApiResponse({ status: 200, description: 'Returns a list of plans.' })
  async getPlans() {
    return { data: await this.billingService.getPlans() };
  }

  @Get('subscription')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve the current active subscription' })
  @ApiResponse({ status: 200, description: 'Returns the active subscription details.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscription(@Request() req: any) {
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

  @Post('subscribe')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Subscribe to a plan' })
  async subscribe(@Request() req: any, @Body() body: any) {
    return { data: await this.billingService.subscribe(req.organizationId, body.planId, body.interval) };
  }

  @Patch('subscription')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Update subscription details' })
  async updateSubscription(@Request() req: any, @Body() body: any) {
    return { data: await this.billingService.updateSubscription(req.organizationId, body) };
  }

  @Post('cancel')
  @UseGuards(ApiKeyAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel active subscription' })
  async cancelSubscription(@Request() req: any) {
    return { data: await this.billingService.cancelSubscription(req.organizationId) };
  }

  @Get('invoices')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List invoices' })
  async getInvoices(@Request() req: any) {
    return { data: await this.billingService.getInvoices(req.organizationId) };
  }

  @Get('invoices/:id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get specific invoice' })
  async getInvoice(@Request() req: any, @Param('id') id: string) {
    return { data: await this.billingService.getInvoice(req.organizationId, id) };
  }

  @Get('payment-method')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List payment methods' })
  async getPaymentMethods(@Request() req: any) {
    return { data: await this.billingService.getPaymentMethods(req.organizationId) };
  }

  @Post('payment-method')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Add a payment method' })
  async addPaymentMethod(@Request() req: any, @Body() body: any) {
    return { data: await this.billingService.addPaymentMethod(req.organizationId, body) };
  }

  @Delete('payment-method/:id')
  @UseGuards(ApiKeyAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment method' })
  async deletePaymentMethod(@Request() req: any, @Param('id') id: string) {
    await this.billingService.deletePaymentMethod(req.organizationId, id);
    return;
  }
}
