import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, Prisma } from '@prisma/client';

export interface RawTransactionInput {
  organizationId: string;
  accountId?: string;
  provider: string;
  externalTransactionId: string;
  amount: number; // Floating point from provider (e.g., 250.50)
  currency: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'POSTED' | 'REVERSED';
  source: 'PROVIDER_SYNC' | 'API_IMPORT' | 'MANUAL';
  reference?: string;
  occurredAt: Date;
  metadata?: any;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safely converts floating point currency (250.50) to minor units (25050).
   * Note: This assumes 2 decimal places for the currency (like USD, NGN, GBP).
   * In a full implementation, you'd look up the currency exponent.
   */
  private convertToMinorUnits(amount: number): bigint {
    return BigInt(Math.round(amount * 100));
  }

  /**
   * Ingests a raw transaction from a provider, normalizing it and saving it idempotently.
   */
  async ingestTransaction(input: RawTransactionInput): Promise<Transaction | null> {
    try {
      const minorAmount = this.convertToMinorUnits(input.amount);

      // Perform an Upsert so that if the provider sends the same transaction twice,
      // it just updates the existing one (Idempotency Rule #24).
      // We also use an Outbox pattern by wrapping it in a transaction (Rule #59).
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const transaction = await tx.transaction.upsert({
          where: {
            provider_externalTransactionId: {
              provider: input.provider,
              externalTransactionId: input.externalTransactionId,
            }
          },
          create: {
            organizationId: input.organizationId,
            accountId: input.accountId,
            provider: input.provider,
            externalTransactionId: input.externalTransactionId,
            amount: minorAmount,
            currency: input.currency,
            direction: input.direction,
            status: input.status,
            source: input.source,
            reference: input.reference,
            occurredAt: input.occurredAt,
            metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
          update: {
            status: input.status,
            // Providers might update pending transactions to posted
            reference: input.reference,
          }
        });

        // Outbox Pattern: Save a domain event atomically
        await tx.outboxEvent.create({
          data: {
            eventType: 'TransactionIngested',
            payload: {
              transactionId: transaction.id,
              organizationId: transaction.organizationId,
              status: transaction.status,
            } as Prisma.InputJsonValue,
          }
        });

        return transaction;
      });

    } catch (error) {
      this.logger.error(`Failed to ingest transaction ${input.externalTransactionId}`, error);
      throw error;
    }
  }
}
