import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      status: user?.onboardingStatus || 'NOT_STARTED',
      emailVerified: !!user?.emailVerifiedAt,
      phoneVerified: !!user?.phoneVerifiedAt
    };
  }

  async updateProfile(userId: string, data: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        onboardingStatus: 'PROFILE_CREATED'
      }
    });
    return { success: true, message: 'Profile updated' };
  }

  async updateOrganization(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true }
    });

    if (!user) throw new BadRequestException('User not found');

    if (user.memberships.length > 0) {
      const orgId = user.memberships[0].organizationId;
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          legalName: data.legalName,
          country: data.country,
          state: data.state,
          industry: data.industry,
          website: data.website,
          businessEmail: data.businessEmail,
          businessPhone: data.businessPhone,
          registrationNumber: data.registrationNumber
        }
      });
    } else {
      // In a real app, you might want to create the organization here if it doesn't exist
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'ORGANIZATION_DETAILS_COMPLETED' }
    });

    return { success: true, message: 'Organization details updated' };
  }

  async completeOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.onboardingStatus === 'ACTIVE') {
      throw new BadRequestException('Onboarding already complete or user not found');
    }

    // Usually there is compliance and subscription checks here,
    // we'll jump straight to ACTIVE for now.
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'ACTIVE' }
    });

    return { success: true, message: 'Onboarding completed' };
  }
}
