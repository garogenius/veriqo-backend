import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/superadmin.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('v1/audit-logs')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs' })
  async exportLogs(@Query() query: any) {
    return this.auditLogService.exportLogs(query);
  }

  @Get()
  @ApiOperation({ summary: 'List audit logs (SuperAdmin only)' })
  async getLogs(@Query() query: any) {
    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific audit log (SuperAdmin only)' })
  async getLog(@Param('id') id: string) {
    return this.auditLogService.findById(id);
  }
}
