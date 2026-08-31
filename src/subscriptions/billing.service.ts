import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService
  ) {}

  async getPlans() {
    return this.prisma.plan.findMany();
  }

  async subscribe(organizationId: string, planId: string, interval: 'MONTHLY' | 'YEARLY') {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const amount = interval === 'MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice;
    
    // Abstracted away payment processing - using mock logic here
    const status = 'ACTIVE'; // Assume mock success
    
    const sub = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId,
        status,
        interval,
        currentPeriodEnd: new Date(Date.now() + (interval === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000)
      },
      update: {
        planId,
        status,
        interval,
        currentPeriodEnd: new Date(Date.now() + (interval === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000)
      }
    });

    // Create an Invoice for the record
    await this.prisma.invoice.create({
      data: {
        organizationId,
        subscriptionId: sub.id,
        amount,
        currency: plan.currency,
        status: 'PAID',
        dueDate: new Date(),
        paidAt: new Date()
      }
    });

    // Emit event
    await this.eventsService.dispatch({
      type: 'subscription.created',
      organizationId,
      resourceType: 'Subscription',
      resourceId: sub.id,
      payload: { planId, status, interval }
    });

    return sub;
  }

  async updateSubscription(organizationId: string, data: any) {
    const sub = await this.prisma.subscription.findUnique({ where: { organizationId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const updated = await this.prisma.subscription.update({
      where: { organizationId },
      data
    });

    await this.eventsService.dispatch({
      type: 'subscription.updated',
      organizationId,
      resourceType: 'Subscription',
      resourceId: sub.id,
      payload: { ...data }
    });

    return updated;
  }

  async cancelSubscription(organizationId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { organizationId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const canceled = await this.prisma.subscription.update({
      where: { organizationId },
      data: { status: 'CANCELLED' }
    });

    await this.eventsService.dispatch({
      type: 'subscription.cancelled',
      organizationId,
      resourceType: 'Subscription',
      resourceId: sub.id,
      payload: { status: 'CANCELLED' }
    });

    return canceled;
  }

  async getInvoices(organizationId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getInvoice(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getPaymentMethods(organizationId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { organizationId }
    });
  }

  async addPaymentMethod(organizationId: string, data: any) {
    return this.prisma.paymentMethod.create({
      data: {
        organizationId,
        provider: data.provider || 'MOCK_PAY',
        providerToken: data.providerToken,
        brand: data.brand,
        last4: data.last4,
        isDefault: data.isDefault || false
      }
    });
  }

  async deletePaymentMethod(organizationId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, organizationId }
    });
    if (!pm) throw new NotFoundException('Payment method not found');
    
    await this.prisma.paymentMethod.delete({
      where: { id }
    });
  }
}
