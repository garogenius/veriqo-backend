import { Controller, Post, Body, UseGuards, UseInterceptors, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchTransactionDto } from './dto/match-transaction.dto';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';

@ApiTags('Reconciliation')
@ApiSecurity('ApiKey')
@Controller('v1/reconciliation')
export class MatchController {
  constructor(private readonly matchService: MatchService) { }

  @Post('match')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Match expected financial records against received transactions' })
  @ApiHeader({ name: 'Idempotency-Key', description: 'Unique key to prevent duplicate operations', required: false })
  @ApiResponse({ status: 200, description: 'Successful match attempt.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async matchTransaction(@Request() req: any, @Body() matchTransactionDto: MatchTransactionDto) {
    return this.matchService.matchTransaction(req.organizationId, matchTransactionDto.expectedPaymentId, matchTransactionDto.transactionId);
  }
}
