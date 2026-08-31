import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new API Key for the organization' })
  @ApiResponse({ status: 201, description: 'API Key generated. Secret is only returned once.' })
  async createApiKey(@Request() req: any) {
    const organizationId = req.organizationId || 'org_test123';

    // Using a mock dto here for illustration, this would typically come from body
    const mockDto: CreateApiKeyDto = {
      apiClientId: `client_${organizationId}`,
      environment: 'SANDBOX',
      scopes: ['*']
    };

    return this.apiKeysService.create(organizationId, mockDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active API Keys' })
  @ApiResponse({ status: 200, description: 'Returns a list of API keys (without secrets).' })
  async getApiKeys(@Request() req: any) {
    const organizationId = req.organizationId || 'org_test123';
    return this.apiKeysService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific API Key' })
  @ApiResponse({ status: 200, description: 'Returns the API key (without secret).' })
  async getApiKey(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || 'org_test123';
    return this.apiKeysService.findById(organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API Key' })
  @ApiResponse({ status: 200, description: 'Returns the updated API key.' })
  async updateApiKey(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const organizationId = req.organizationId || 'org_test123';
    return this.apiKeysService.updateKey(organizationId, id, body);
  }

  @Post(':id/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate an API Key' })
  @ApiResponse({ status: 200, description: 'API Key rotated. New secret is only returned once.' })
  async rotateApiKey(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || 'org_test123';
    return this.apiKeysService.rotateKey(organizationId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API Key' })
  @ApiResponse({ status: 204, description: 'API Key revoked successfully.' })
  async revokeApiKey(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || 'org_test123';
    return this.apiKeysService.revoke(organizationId, id);
  }
}
