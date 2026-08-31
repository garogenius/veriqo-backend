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

  async findCurrent(userId: string): Promise<Organization> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
      take: 1
    });

    if (memberships.length === 0) {
      throw new NotFoundException('No active organizations found for this user');
    }

    return memberships[0].organization;
  }

  async findAll(userId: string) {
    return this.prisma.organization.findMany({
      where: { memberships: { some: { userId } } }
    });
  }

  async updateSettings(orgId: string, userId: string, settings: any) {
    const org = await this.findById(orgId, userId);
    return this.prisma.organization.update({
      where: { id: org.id },
      data: { settings }
    });
  }

  async update(orgId: string, userId: string, data: any) {
    // Check access first
    await this.findById(orgId, userId);
    return this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }

  async remove(orgId: string, userId: string) {
    const org = await this.findById(orgId, userId);
    // In a real app, only OWNER can delete. We will enforce via Guards later.
    return this.prisma.organization.update({
      where: { id: orgId },
      data: { status: 'DELETED' }
    });
  }

  // --- Members ---
  async getMembers(orgId: string, userId: string) {
    await this.findById(orgId, userId); // check access
    return this.prisma.organizationMembership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, role: true }
    });
  }

  async addMember(orgId: string, userId: string, data: any) {
    await this.findById(orgId, userId);
    return this.prisma.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: data.userId,
        roleId: data.roleId,
      }
    });
  }

  async updateMember(orgId: string, userId: string, memberId: string, data: any) {
    await this.findById(orgId, userId);
    return this.prisma.organizationMembership.update({
      where: { id: memberId, organizationId: orgId },
      data: { roleId: data.roleId, status: data.status }
    });
  }

  async removeMember(orgId: string, userId: string, memberId: string) {
    await this.findById(orgId, userId);
    return this.prisma.organizationMembership.update({
      where: { id: memberId, organizationId: orgId },
      data: { status: 'REMOVED' }
    });
  }

  // --- Invitations ---
  async inviteMember(orgId: string, userId: string, data: any) {
    await this.findById(orgId, userId);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    return this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: data.email,
        roleId: data.roleId,
        token,
        expiresAt,
        invitedById: userId,
      }
    });
  }

  async getInvitations(orgId: string, userId: string) {
    await this.findById(orgId, userId);
    return this.prisma.invitation.findMany({
      where: { organizationId: orgId, status: 'PENDING' },
      include: { role: true, invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
  }

  async acceptInvitation(token: string, userId: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    const membership = await this.prisma.organizationMembership.create({
      data: {
        userId,
        organizationId: invite.organizationId,
        roleId: invite.roleId,
        invitedById: invite.invitedById,
        joinedAt: new Date()
      }
    });

    await this.prisma.invitation.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' }
    });

    return membership;
  }

  async deleteInvitation(id: string, userId: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Invitation not found');
    await this.findById(invite.organizationId, userId); // verify admin rights
    
    return this.prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' }
    });
  }

  async getInvitation(orgId: string, userId: string, invitationId: string) {
    await this.findById(orgId, userId);
    const invite = await this.prisma.invitation.findUnique({
      where: { id: invitationId, organizationId: orgId },
      include: { role: true, invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
    if (!invite) throw new NotFoundException('Invitation not found');
    return invite;
  }

  async resendInvitation(orgId: string, userId: string, invitationId: string) {
    await this.findById(orgId, userId);
    const invite = await this.prisma.invitation.findUnique({
      where: { id: invitationId, organizationId: orgId }
    });
    
    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('Invitation not found or is no longer pending');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Reset 7 days

    return this.prisma.invitation.update({
      where: { id: invite.id },
      data: { token, expiresAt }
    });
  }
}
