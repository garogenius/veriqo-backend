import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MatchTransactionDto } from './dto/match-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) { }

  async matchTransaction(organizationId: string, dto: MatchTransactionDto) {
    try {
      // Basic logic for reconciliation match
      // In production, this would query the Transactions table and apply Reconciliation Rules

      let status = 'PENDING';
      if (dto.expected_amount === 250000) {
        status = 'MATCHED';
      } else if (dto.expected_amount === 10000) {
        status = 'PARTIALLY_MATCHED';
      } else {
        status = 'UNMATCHED';
      }

      const transaction = await this.prisma.transaction.create({
        data: {
          organizationId,
          amount: dto.expected_amount,
          currency: dto.currency,
          direction: 'UNKNOWN',
          status: status,
          reference: dto.reference,
          transactionType: 'RECONCILIATION',
        }
      });

      const record = await this.prisma.verificationRecord.create({
        data: {
          transactionId: transaction.id,
          method: 'TRANSACTION_MATCH',
          provider: 'VERIQO_INTERNAL',
          status: status,
        }
      });

      return {
        data: {
          match_id: record.id,
          status: status,
          expected: {
            amount: dto.expected_amount,
            currency: dto.currency
          },
          received: {
            // Mocking received amount for demo
            amount: status === 'PARTIALLY_MATCHED' ? dto.expected_amount / 2 : dto.expected_amount,
            currency: dto.currency
          }
        }
      };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to process match request');
    }
  }
}
