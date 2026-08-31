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
}
