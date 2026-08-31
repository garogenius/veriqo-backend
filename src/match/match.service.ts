import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { MatchTransactionDto } from './dto/match-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Reconciliation Engine: Matches expected payments against actual transactions.
   */
  async matchTransaction(organizationId: string, expectedPaymentId: string, transactionId: string) {
    try {
      // 1. Fetch Expected Payment
      const expectedPayment = await this.prisma.expectedPayment.findUnique({
        where: { id: expectedPaymentId, organizationId }
      });

      if (!expectedPayment) {
        throw new NotFoundException('Expected Payment not found');
      }

      // 2. Fetch Transaction
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId, organizationId }
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // 3. Evaluate Match Rules
      let strategyUsed = 'MANUAL';
      let status = 'PENDING';
      
      if (transaction.amount === expectedPayment.expectedAmount) {
        status = 'MATCHED';
        strategyUsed = 'EXACT';
      } else if (transaction.amount < expectedPayment.expectedAmount) {
        status = 'PARTIALLY_MATCHED';
        strategyUsed = 'AMOUNT';
      } else {
        status = 'EXCEPTION'; // Overpayment
        strategyUsed = 'AMOUNT';
      }

      // 4. Create the ReconciliationMatch record
      const match = await this.prisma.reconciliationMatch.create({
        data: {
          expectedPaymentId,
          transactionId,
          matchedAmount: transaction.amount,
          strategyUsed,
        }
      });

      // 5. Update the Expected Payment status
      await this.prisma.expectedPayment.update({
        where: { id: expectedPaymentId },
        data: { status }
      });

      // 6. Outbox Pattern for Domain Event
      await this.prisma.outboxEvent.create({
        data: {
          eventType: 'ReconciliationMatched',
          payload: {
            matchId: match.id,
            status,
            organizationId
          }
        }
      });

      return {
        data: {
          match_id: match.id,
          status,
          strategy_used: strategyUsed,
          matched_amount: Number(transaction.amount) / 100, // Returning as decimal for API
          currency: transaction.currency
        }
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to process reconciliation match');
    }
  }

  async findAllJobs(organizationId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.reconciliationJob.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.reconciliationJob.count({ where: { organizationId } })
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findJobById(organizationId: string, id: string) {
    const job = await this.prisma.reconciliationJob.findFirst({
      where: { id, organizationId }
    });
    if (!job) throw new NotFoundException('Reconciliation job not found');
    return { data: job };
  }

  async runJob(organizationId: string, jobId: string) {
    const job = await this.prisma.reconciliationJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job not found');

    // MOCK engine logic: in production, this would look at ExpectedPayments and Transactions, run the matching algorithm, and update the job.
    return this.prisma.reconciliationJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
  }

  async getJobMatches(organizationId: string, jobId: string) {
    // A mock representation since ReconcilliationMatch points to ExpectedPayment, not Job directly yet.
    // In a fully flushed model, match should link to Job or ExpectedPayment links to Job.
    return { data: [], meta: { total: 0 } };
  }

  async getJobExceptions(organizationId: string, jobId: string) {
    return { data: await this.prisma.reconciliationException.findMany({ where: { jobId } }) };
  }

  async getJobSummary(organizationId: string, jobId: string) {
    const job = await this.prisma.reconciliationJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job not found');
    return { data: { matched: job.matchedCount, unmatched: job.unmatchedCount, exceptions: job.exceptionCount, status: job.status } };
  }

  async resolveException(organizationId: string, jobId: string, data: any) {
    const exception = await this.prisma.reconciliationException.findFirst({
      where: { id: data.exceptionId, jobId }
    });
    if (!exception) throw new NotFoundException('Exception not found');

    return this.prisma.reconciliationException.update({
      where: { id: exception.id },
      data: { status: 'RESOLVED' }
    });
  }

  async importExpectedPayments(organizationId: string, payload: any) {
    // Create a new reconciliation job to manage this import
    const job = await this.prisma.reconciliationJob.create({
      data: {
        organizationId,
        status: 'PENDING'
      }
    });

    // In production, loop through payload.payments and create ExpectedPayment rows
    return { data: { jobId: job.id, status: 'IMPORTED', count: payload.payments?.length || 0 } };
  }
}
