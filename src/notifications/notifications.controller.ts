import { Controller, Get, Patch, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  async getNotifications(@Request() req: any) {
    const notifications = await this.notificationsService.getNotifications(req.user.id);
    return { data: notifications };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(req.user.id, id);
    return { data: notification };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Request() req: any) {
    const prefs = await this.notificationsService.getPreferences(req.user.id);
    return { data: prefs };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Request() req: any, @Body() body: any) {
    const prefs = await this.notificationsService.updatePreferences(req.user.id, body);
    return { data: prefs };
  }
}
