import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Organization, OrgType } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, data: { name: string; type: OrgType; country: string }): Promise<Organization> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          organizationType: data.type,
          country: data.country,
          ownerId: userId,
        },
      });

      // Assign OWNER role (assuming role exists or creating it if not)
      // For Phase 1, we will hardcode the owner role lookup or creation
      let ownerRole = await tx.role.findUnique({ where: { name: 'OWNER' } });
      if (!ownerRole) {
        ownerRole = await tx.role.create({ data: { name: 'OWNER', description: 'Organization Owner' } });
      }

      // Create membership
      await tx.organizationMembership.create({
        data: {
          userId,
          organizationId: org.id,
          roleId: ownerRole.id,
        },
      });

      return org;
    });
  }

  async findById(orgId: string, userId: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { memberships: { where: { userId } } },
    });

    if (!org || org.memberships.length === 0) {
      throw new NotFoundException('Organization not found or you do not have access');
    }

    return org;
  }
}
