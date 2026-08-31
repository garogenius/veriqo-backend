import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  checkLive() {
    return { status: 'UP' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async checkReady() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'READY', db: 'UP' };
    } catch (e) {
      return { status: 'UNREADY', db: 'DOWN' };
    }
  }

  @Get('providers')
  @ApiOperation({ summary: 'Provider health check' })
  checkProviders() {
    return {
      data: [
        { name: 'MOCK_BANK', status: 'UP' },
        { name: 'PRODUCTION_BANK', status: 'UNKNOWN' }
      ]
    };
  }
}
