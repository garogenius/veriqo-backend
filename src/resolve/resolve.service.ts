import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ResolveAccountDto } from './dto/resolve-account.dto';
import { ProviderRouter } from '../providers/provider.router';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResolveService {
  constructor(
    private prisma: PrismaService
  ) {}

  async resolveAccount(organizationId: string, environment: 'SANDBOX' | 'PRODUCTION', dto: ResolveAccountDto) {
    try {
      const response = {
        status: 'VERIFIED',
        account: dto.account,
        institution: { name: 'MOCK_BANK', code: dto.institution }
      };

      // We use a dummy transaction ID for Resolve since it's an account check, not a payment.
      // In a real implementation, you might have a distinct model for AccountResolution.
      // For this spec, we will store it in VerificationRecord linked to a dummy Transaction or create an AccountResolution model.
      // Let's create a dummy transaction to satisfy the foreign key constraint for VerificationRecord.
      
      const transaction = await this.prisma.transaction.create({
        data: {
          organizationId,
          provider: 'MOCK',
          externalTransactionId: `mock_resolve_${Date.now()}_${Math.random()}`,
          amount: BigInt(0),
          currency: 'NGN',
          direction: 'N/A',
          status: 'N/A',
          transactionType: 'ACCOUNT_RESOLUTION',
        }
      });

      const record = await this.prisma.verificationRecord.create({
        data: {
          transactionId: transaction.id,
          method: 'ACCOUNT_RESOLVE',
          provider: response.institution?.name || 'Unknown',
          status: response.status,
          result: JSON.parse(JSON.stringify(response)),
        }
      });

      return {
        data: {
          resolution_id: record.id,
          status: response.status,
          account: response.account,
          institution: response.institution,
          resolved_at: record.createdAt
        }
      };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to resolve account');
      throw new InternalServerErrorException('Failed to resolve account');
    }
  }

  async findAll(organizationId: string, query: { page?: number, limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where: { connection: { organizationId } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.financialAccount.count({
        where: { connection: { organizationId } }
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
    return this.prisma.financialAccount.findFirst({
      where: { id, connection: { organizationId } }
    });
  }
}
