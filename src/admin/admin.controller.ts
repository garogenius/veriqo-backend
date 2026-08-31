import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from '../auth/superadmin.guard';
import { OrgStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Superadmin')
@ApiBearerAuth('JWT')
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations (Superadmin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOrganizations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.adminService.getAllOrganizations(Number(page), Number(limit));
  }

  @Patch('organizations/:id/status')
  @ApiOperation({ summary: 'Update organization status (e.g. SUSPEND)' })
  async updateOrgStatus(
    @Param('id') id: string,
    @Body('status') status: OrgStatus,
    @Request() req: any
  ) {
    return this.adminService.updateOrganizationStatus(id, status, req.user.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.adminService.getAllUsers(Number(page), Number(limit));
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Monitor platform-wide transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.adminService.getPlatformTransactions(Number(page), Number(limit));
  }
}
