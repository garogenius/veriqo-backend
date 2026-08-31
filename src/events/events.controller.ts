import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Events & Outbox')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List recent platform events for the organization' })
  @ApiResponse({ status: 200, description: 'Returns a list of recent events.' })
  async getEvents(@Request() req: any) {
    const organizationId = req.organizationId || 'org_test123';
    
    // We retrieve the events by querying the JSON payload in outbox or security events.
    // For now, we return SecurityEvents as they represent the tenant-scoped domain events well.
    const events = await this.prisma.securityEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { data: events };
  }
}
