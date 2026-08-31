import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';
import { ProviderRouter } from '../providers/provider.router';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerifyService {
  constructor(
    private providerRouter: ProviderRouter,
    private prisma: PrismaService
  ) {}

  async verifyTransaction(organizationId: string, environment: 'SANDBOX' | 'PRODUCTION', dto: VerifyTransactionDto) {
    try {
      const response = await this.providerRouter.verifyTransaction(environment, {
        amount: dto.amount,
        currency: dto.currency,
        reference: dto.reference
      });

      const transaction = await this.prisma.transaction.create({
        data: {
          organizationId,
          provider: 'MOCK',
          externalTransactionId: `mock_verify_${Date.now()}_${Math.random()}`,
          amount: BigInt(dto.amount),
          currency: dto.currency,
          direction: 'UNKNOWN',
          status: response.status === 'VERIFIED' ? 'SUCCESS' : response.status,
          reference: dto.reference,
          transactionType: 'VERIFICATION',
        }
      });

      const record = await this.prisma.verificationRecord.create({
        data: {
          transactionId: transaction.id,
          method: 'TRANSACTION_VERIFY',
          provider: environment === 'PRODUCTION' ? 'ProductionProvider' : 'MockProvider',
          status: response.status,
          result: JSON.parse(JSON.stringify(response)),
        }
      });

      return {
        data: {
          verification_id: record.id,
          status: response.status,
          transaction: response.transaction,
          verified_at: record.createdAt
        }
      };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to verify transaction');
    }
  }
}
