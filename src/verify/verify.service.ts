import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';
import { ProviderRouterService } from '../providers/provider-router.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementService } from '../subscriptions/entitlement.service';
import { UsageService } from '../subscriptions/usage.service';

export interface VerificationStrategy {
  evaluate(transaction: any, criteria: any): boolean;
}

class AmountMatchStrategy implements VerificationStrategy {
  evaluate(transaction: any, criteria: any): boolean {
    // Assuming minor unit comparison
    return transaction.amount === BigInt(criteria.amount);
  }
}

class ReferenceMatchStrategy implements VerificationStrategy {
  evaluate(transaction: any, criteria: any): boolean {
    return transaction.reference === criteria.reference;
  }
}

@Injectable()
export class VerifyService {
  private strategies = {
    AMOUNT_MATCH: new AmountMatchStrategy(),
    REFERENCE_MATCH: new ReferenceMatchStrategy(),
  };

  constructor(
    private providerRouter: ProviderRouterService,
    private prisma: PrismaService,
    private entitlementService: EntitlementService,
    private usageService: UsageService,
  ) {}

  async verifyTransaction(organizationId: string, environment: 'SANDBOX' | 'PRODUCTION', dto: VerifyTransactionDto) {
    try {
      // Enforce Quota Limits (Rule 118, 140)
      if (environment === 'PRODUCTION') {
        await this.entitlementService.enforceQuota(organizationId, 'maxTransactions');
      }
      // Check if transaction exists locally first
      let transaction = await this.prisma.transaction.findFirst({
        where: { 
          organizationId, 
          reference: dto.reference 
        }
      });

      let status = 'PENDING';
      let providerName = 'LOCAL';
      let resultPayload: any = {};

      if (transaction) {
        // Evaluate rules locally
        const isAmountMatch = this.strategies.AMOUNT_MATCH.evaluate(transaction, dto);
        const isRefMatch = this.strategies.REFERENCE_MATCH.evaluate(transaction, dto);

        if (isAmountMatch && isRefMatch) {
          status = 'VERIFIED';
        } else if (!isAmountMatch) {
          status = 'REQUIRES_REVIEW';
          resultPayload = { reason: 'Amount mismatch' };
        }
      } else {
        // Fallback to Provider
        // (Note: In production, providerRouter.verifyTransaction would take the env and dto)
        // Here we mock the behavior since we are still migrating to the new ProviderRouterService interface
        status = 'REQUIRES_REVIEW';
        providerName = 'REMOTE_PROVIDER';
        resultPayload = { reason: 'Transaction not found locally, falling back to provider' };
      }

      // If we don't have a transaction, we should create a stub for tracking the verification request
      if (!transaction) {
        transaction = await this.prisma.transaction.create({
          data: {
            organizationId,
            provider: providerName,
            externalTransactionId: `ver_stub_${Date.now()}_${Math.random()}`,
            amount: BigInt(dto.amount),
            currency: dto.currency,
            direction: 'UNKNOWN',
            status: status === 'VERIFIED' ? 'SUCCESS' : 'PENDING',
            reference: dto.reference,
            transactionType: 'VERIFICATION_STUB',
          }
        });
      }

      const record = await this.prisma.verificationRecord.create({
        data: {
          transactionId: transaction.id,
          method: 'MULTI_STRATEGY',
          provider: providerName,
          status: status,
          result: resultPayload,
        }
      });

      // Outbox Pattern for VerificationCompleted event
      await this.prisma.outboxEvent.create({
        data: {
          eventType: 'VerificationCompleted',
          payload: {
            verificationId: record.id,
            status: record.status,
            organizationId
          }
        }
      });

      // Idempotent Billing Usage (Rule 137)
      if (environment === 'PRODUCTION') {
        await this.usageService.recordUsage(organizationId, 'transaction_verification', record.id);
      }

      return {
        data: {
          verification_id: record.id,
          status: status,
          verified_at: record.createdAt
        }
      };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to verify transaction');
      throw new InternalServerErrorException('Failed to verify transaction');
    }
  }

  async findAll(organizationId: string, query: { page?: number, limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.verificationRecord.findMany({
        where: { transaction: { organizationId } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.verificationRecord.count({
        where: { transaction: { organizationId } }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.verificationRecord.findFirst({
      where: { id, transaction: { organizationId } }
    });
  }
}
