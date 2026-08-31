import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@ApiTags('Financial Connections')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@UseInterceptors(IdempotencyInterceptor)
@Controller('v1/connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a new financial provider account (Bank, Fintech, etc)' })
  @ApiResponse({ status: 201, description: 'Provider linked successfully.' })
  async createConnection(@Request() req: any, @Body() body: any) {
    const organizationId = req.organizationId || 'org_test123';
    return this.connectionsService.createConnection(organizationId, body.providerId, body.environment || 'SANDBOX');
  }

  @Get()
  @ApiOperation({ summary: 'List all financial connections' })
  @ApiResponse({ status: 200, description: 'Returns a list of financial connections.' })
  async getConnections(@Request() req: any) {
    const organizationId = req.organizationId || 'org_test123';
    return this.connectionsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific financial connection' })
  @ApiResponse({ status: 200, description: 'Returns connection details.' })
  async getConnection(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || 'org_test123';
    return this.connectionsService.getConnection(id, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a financial provider' })
  @ApiResponse({ status: 204, description: 'Connection removed successfully.' })
  async deleteConnection(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || req.user?.organizationId || 'org_test123';
    return this.connectionsService.remove(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a financial connection' })
  async updateConnection(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const organizationId = req.organizationId || req.user?.organizationId || 'org_test123';
    return this.connectionsService.update(id, organizationId, body);
  }

  @Post(':id/reconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a reconnect flow for a disconnected or failed connection' })
  async reconnectConnection(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || req.user?.organizationId || 'org_test123';
    return this.connectionsService.reconnect(id, organizationId);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger an immediate sync for a connection' })
  async syncConnection(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || req.user?.organizationId || 'org_test123';
    return this.connectionsService.sync(id, organizationId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get the health and sync status of a connection' })
  async getConnectionStatus(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || req.user?.organizationId || 'org_test123';
    return this.connectionsService.getStatus(id, organizationId);
  }

  @Get(':id/accounts')
  @ApiOperation({ summary: 'List all accounts associated with a connection' })
  async getConnectionAccounts(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || req.user?.organizationId || 'org_test123';
    return this.connectionsService.getAccounts(id, organizationId);
  }
}
