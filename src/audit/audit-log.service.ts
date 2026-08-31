import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async logAction(adminId: string, action: string, targetType: string, targetId?: string, metadata?: any, ipAddress?: string) {
    try {
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId,
          metadata: metadata || {},
          ipAddress
        }
      });
    } catch (e) {
      // In production, consider logging to a file/Datadog if DB fails, but don't crash request.
      console.error('Failed to write audit log', e);
    }
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.adminActionLog.count()
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findById(id: string) {
    const log = await this.prisma.adminActionLog.findUnique({ where: { id } });
    if (!log) throw new Error('Audit log not found');
    return { data: log };
  }

  async exportLogs(query: any) {
    const logs = await this.prisma.adminActionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit export size for the mock
    });

    // In a real implementation, you'd convert this to CSV
    // Returning raw array here for simplicity
    return { data: logs, meta: { message: 'Exported as JSON array' } };
  }
}
