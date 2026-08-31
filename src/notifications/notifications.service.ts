import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  async getPreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!prefs) {
      // Create defaults if they don't exist
      return this.prisma.notificationPreference.create({
        data: { userId }
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: any) {
    const prefs = await this.getPreferences(userId);
    
    return this.prisma.notificationPreference.update({
      where: { id: prefs.id },
      data: {
        emailEnabled: data.emailEnabled ?? prefs.emailEnabled,
        smsEnabled: data.smsEnabled ?? prefs.smsEnabled,
        inAppEnabled: data.inAppEnabled ?? prefs.inAppEnabled
      }
    });
  }
}
