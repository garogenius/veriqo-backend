import { Controller, Post, Body, UseGuards, UseInterceptors, HttpCode, HttpStatus, Request } from '@nestjs/common';
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
}
