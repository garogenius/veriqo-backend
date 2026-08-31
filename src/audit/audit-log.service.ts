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
}
