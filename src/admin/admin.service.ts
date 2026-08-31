import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, OrgStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllOrganizations(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { memberships: true, transactions: true, apiClients: true }
          }
        }
      }),
      this.prisma.organization.count()
    ]);

    return {
      data: organizations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateOrganizationStatus(organizationId: string, status: OrgStatus, adminId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: { status }
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'UPDATE_ORG_STATUS',
          targetType: 'ORGANIZATION',
          targetId: organizationId,
          metadata: { previousStatus: org.status, newStatus: status }
        }
      });

      return updatedOrg;
    });

    return updated;
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          isSuperAdmin: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { memberships: true } }
        }
      }),
      this.prisma.user.count()
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPlatformTransactions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } }
        }
      }),
      this.prisma.transaction.count()
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
