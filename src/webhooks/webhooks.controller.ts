import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Webhooks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully.' })
  async createWebhook(@Request() req: any, @Body() createWebhookDto: CreateWebhookDto) {
    // In production, organizationId comes from the user's active context.
    // For this example, we assume it's passed or stored in the session/req object correctly.
    // We will hardcode a placeholder organization ID if not present for the sake of the mock.
    const organizationId = req.organizationId || 'org_test123';
    return this.webhooksService.create(organizationId, createWebhookDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered webhooks for the organization' })
  async getWebhooks(@Request() req: any) {
    const organizationId = req.organizationId || 'org_test123';
    return this.webhooksService.findAll(organizationId);
  }
}
