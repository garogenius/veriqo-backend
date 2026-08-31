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
}
