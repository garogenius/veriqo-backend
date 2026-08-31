import { Controller, Post, Get, Param, Query, Body, UseGuards, UseInterceptors, HttpCode, HttpStatus, Request, NotFoundException } from '@nestjs/common';
import { VerifyService } from './verify.service';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';

@ApiTags('Verification')
@ApiSecurity('ApiKey')
@Controller('v1/transactions')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Verify a financial transaction' })
  @ApiHeader({ name: 'Idempotency-Key', description: 'Unique key to prevent duplicate operations', required: false })
  @ApiResponse({ status: 200, description: 'Successful transaction verification.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyTransaction(@Request() req: any, @Body() verifyTransactionDto: VerifyTransactionDto) {
    return this.verifyService.verifyTransaction(req.organizationId, req.apiKey.environment, verifyTransactionDto);
  }

  @Get()
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List verification records' })
  async getVerifications(@Request() req: any, @Query() query: any) {
    return this.verifyService.findAll(req.organizationId, query);
  }

  @Get(':id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get specific verification record' })
  async getVerification(@Request() req: any, @Param('id') id: string) {
    const verification = await this.verifyService.findById(req.organizationId, id);
    if (!verification) throw new NotFoundException('Verification not found');
    return { data: verification };
  }
}
