import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Compliance & Verification')
@ApiSecurity('ApiKey')
@Controller('v1/compliance')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('kyb')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Submit organization for KYB Verification' })
  @ApiResponse({ status: 200, description: 'KYB verification initiated/completed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitKyb(@Request() req: any) {
    const profile = await this.complianceService.submitKyb(req.organizationId);
    return { data: profile };
  }

  @Get('kyb')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get KYB profile details' })
  async getKybProfile(@Request() req: any) {
    const kyb = await this.prisma.kybProfile.findUnique({
      where: { organizationId: req.organizationId }
    });
    return { data: kyb };
  }

  @Patch('kyb')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Update KYB profile details' })
  async updateKybProfile(@Request() req: any, @Body() body: any) {
    const kyb = await this.complianceService.updateKyb(req.organizationId, body);
    return { data: kyb };
  }

  @Post('kyb/resubmit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Resubmit KYB Verification' })
  async resubmitKyb(@Request() req: any) {
    const profile = await this.complianceService.resubmitKyb(req.organizationId);
    return { data: profile };
  }

  @Get('status')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Retrieve current compliance verification status' })
  @ApiResponse({ status: 200, description: 'Returns KYB status for the organization.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@Request() req: any) {
    const kyb = await this.prisma.kybProfile.findUnique({
      where: { organizationId: req.organizationId }
    });

    return {
      data: {
        kyb_status: kyb ? kyb.status : 'NOT_STARTED',
        verified_at: kyb ? kyb.verifiedAt : null
      }
    };
  }

  @Post('consent')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Record user consent for financial data access' })
  @ApiResponse({ status: 201, description: 'Consent recorded successfully.' })
  async recordConsent(@Request() req: any, @Body() body: any) {
    // Note: In production, body should be validated with a DTO (e.g. ConsentDto)
    const consent = await this.prisma.consentRecord.create({
      data: {
        userId: req.user.id,
        consentType: body.consentType || 'FINANCIAL_ACCESS',
        version: body.version || 'v1.0',
        status: 'GRANTED'
      }
    });

    return { data: consent };
  }

  @Get('consent')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List all consents for a user' })
  async getConsents(@Request() req: any) {
    // Assuming ApiKeyAuthGuard validates and attaches a user or the client acts on behalf of a user
    const userId = req.user?.id || req.body?.userId;
    const consents = await this.complianceService.getConsents(userId);
    return { data: consents };
  }

  @Delete('consent/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Revoke a specific consent' })
  async revokeConsent(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.body?.userId;
    await this.complianceService.revokeConsent(userId, id);
  }

  @Post('documents')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Upload a compliance document' })
  async uploadDocument(@Request() req: any, @Body() body: any) {
    const doc = await this.complianceService.uploadDocument(req.organizationId, body);
    return { data: doc };
  }

  @Get('documents')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List compliance documents' })
  async getDocuments(@Request() req: any) {
    const docs = await this.complianceService.getDocuments(req.organizationId);
    return { data: docs };
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Delete a compliance document' })
  async deleteDocument(@Request() req: any, @Param('id') id: string) {
    await this.complianceService.deleteDocument(req.organizationId, id);
  }
}
