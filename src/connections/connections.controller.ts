import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Financial Connections')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
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
    const organizationId = req.organizationId || 'org_test123';
    return this.connectionsService.remove(id, organizationId);
  }
}
