import { Controller, Get, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
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
}
