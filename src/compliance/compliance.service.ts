import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MockKybProvider } from './mock-kyb.provider';

@Injectable()
export class ComplianceService {
  constructor(
    private prisma: PrismaService,
    private mockKybProvider: MockKybProvider
  ) {}

  /**
   * Submits an organization for Know Your Business (KYB) Verification.
   */
  async submitKyb(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) throw new NotFoundException('Organization not found');

    const result = await this.mockKybProvider.verifyBusiness(
      organization.legalName || organization.name,
      'RC-XXXXXX', // Mock registration
      organization.country
    );

    const profile = await this.prisma.kybProfile.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider: 'MOCK_KYB',
        status: result.status,
        legalName: organization.legalName || organization.name,
        country: organization.country,
        verifiedAt: result.status === 'VERIFIED' ? new Date() : null,
      },
      update: {
        status: result.status,
        verifiedAt: result.status === 'VERIFIED' ? new Date() : null,
      }
    });

    // Create an Audit Security Event
    await this.prisma.securityEvent.create({
      data: {
        organizationId,
        eventType: result.status === 'VERIFIED' ? 'KYB_VERIFIED' : 'KYB_REJECTED',
        severity: result.status === 'VERIFIED' ? 'INFO' : 'HIGH'
      }
    });

    return profile;
  }
  async resubmitKyb(organizationId: string) {
    return this.submitKyb(organizationId);
  }

  async updateKyb(organizationId: string, data: any) {
    const kyb = await this.prisma.kybProfile.findUnique({ where: { organizationId } });
    if (!kyb) throw new NotFoundException('KYB profile not found');

    return this.prisma.kybProfile.update({
      where: { id: kyb.id },
      data
    });
  }

  async uploadDocument(organizationId: string, data: any) {
    let kyb = await this.prisma.kybProfile.findUnique({ where: { organizationId } });
    if (!kyb) {
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
      kyb = await this.prisma.kybProfile.create({
        data: {
          organizationId,
          provider: 'MOCK_KYB',
          status: 'PENDING',
          legalName: org?.legalName || org?.name || 'Unknown',
          country: org?.country || 'US'
        }
      });
    }

    return this.prisma.complianceDocument.create({
      data: {
        kybProfileId: kyb.id,
        organizationId,
        type: data.type || 'UNKNOWN',
        fileUrl: data.fileUrl || 'https://mock.url/doc.pdf',
        status: 'PENDING'
      }
    });
  }

  async getDocuments(organizationId: string) {
    return this.prisma.complianceDocument.findMany({
      where: { organizationId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  async deleteDocument(organizationId: string, documentId: string) {
    const doc = await this.prisma.complianceDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found');
    }
    
    await this.prisma.complianceDocument.delete({ where: { id: documentId } });
  }

  async getConsents(userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' }
    });
  }

  async revokeConsent(userId: string, consentId: string) {
    const consent = await this.prisma.consentRecord.findUnique({ where: { id: consentId } });
    if (!consent || consent.userId !== userId) {
      throw new NotFoundException('Consent not found');
    }

    return this.prisma.consentRecord.update({
      where: { id: consentId },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date()
      }
    });
  }
}
