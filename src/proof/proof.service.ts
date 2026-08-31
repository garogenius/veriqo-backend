import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProofDto } from './dto/create-proof.dto';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac, randomBytes } from 'crypto';

@Injectable()
export class ProofService {
  constructor(private prisma: PrismaService) {}

  private signProof(data: any): string {
    const secret = process.env.PROOF_SECRET || 'default_secret';
    return createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
  }
  async createProof(organizationId: string, dto: CreateProofDto) {
    try {
      const verification = await this.prisma.verificationRecord.findUnique({
        where: { id: dto.verification_id },
        include: { transaction: true }
      });

      if (!verification || verification.transaction.organizationId !== organizationId) {
        throw new NotFoundException('Verification record not found');
      }

      const token = randomBytes(16).toString('hex');
      const payloadToSign = { verificationId: verification.id, token };
      const signature = this.signProof(payloadToSign);

      const proof = await this.prisma.proof.create({
        data: {
          verificationId: verification.id,
          status: 'ACTIVE',
          token: `${token}.${signature}`,
        }
      });

      return { data: proof };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to create proof');
    }
  }

  async getProof(proofId: string) {
    const proof = await this.prisma.proof.findUnique({
      where: { id: proofId },
      include: { 
        verification: {
          include: { transaction: { select: { reference: true, amount: true, currency: true } } }
        } 
      }
    });

    if (!proof) throw new NotFoundException('Proof not found');

    // Public limited view
    return {
      data: {
        id: proof.id,
        status: proof.status,
        createdAt: proof.createdAt,
        amount: proof.verification.transaction.amount,
        currency: proof.verification.transaction.currency,
      }
    };
  }

  async findAll(organizationId: string, query: { page?: number, limit?: number, status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      verification: { transaction: { organizationId } },
      ...(query.status && { status: query.status })
    };

    const [data, total] = await Promise.all([
      this.prisma.proof.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.proof.count({ where })
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async verifyIntegrity(proofId: string) {
    const proof = await this.prisma.proof.findUnique({ where: { id: proofId } });
    if (!proof) throw new NotFoundException('Proof not found');

    const [token, signature] = proof.token.split('.');
    const expectedSignature = this.signProof({ verificationId: proof.verificationId, token });

    return {
      data: {
        id: proof.id,
        status: proof.status,
        isAuthentic: signature === expectedSignature,
        verifiedAt: new Date()
      }
    };
  }
}
