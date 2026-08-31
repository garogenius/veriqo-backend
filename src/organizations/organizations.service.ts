import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Organization, OrgType } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

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

      // Automatically provision a Sandbox API Client and API Key for this new workspace
      const apiClient = await tx.apiClient.create({
        data: {
          organizationId: org.id,
          name: 'Default Sandbox App',
          environment: 'SANDBOX',
          createdById: userId,
        }
      });

      const rawSecret = crypto.randomBytes(32).toString('hex');
      const secretHash = await argon2.hash(rawSecret);

      const apiKey = await tx.apiKey.create({
        data: {
          apiClientId: apiClient.id,
          publicIdentifier: `vrq_test_${crypto.randomBytes(8).toString('hex')}`,
          secretHash,
          environment: 'SANDBOX',
          scopes: ['transactions:write', 'resolve:read', 'proof:write'],
        }
      });

      // We attach the raw api key to the org response temporarily so the user can save it
      return { ...org, initialApiKey: rawSecret, publicIdentifier: apiKey.publicIdentifier };
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
