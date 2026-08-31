import { Controller, Post, Get, Param, Query, Body, UseGuards, UseInterceptors, HttpCode, HttpStatus, Request } from '@nestjs/common';
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

  @Get()
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List reconciliation jobs' })
  async getJobs(@Request() req: any, @Query() query: any) {
    return this.matchService.findAllJobs(req.organizationId, query);
  }

  @Get(':id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get a specific reconciliation job' })
  async getJob(@Request() req: any, @Param('id') id: string) {
    return this.matchService.findJobById(req.organizationId, id);
  }

  @Post(':id/run')
  @UseGuards(ApiKeyAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run a reconciliation job' })
  async runJob(@Request() req: any, @Param('id') id: string) {
    return this.matchService.runJob(req.organizationId, id);
  }

  @Get(':id/matches')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get matches for a job' })
  async getJobMatches(@Request() req: any, @Param('id') id: string) {
    return this.matchService.getJobMatches(req.organizationId, id);
  }

  @Get(':id/exceptions')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get exceptions for a job' })
  async getJobExceptions(@Request() req: any, @Param('id') id: string) {
    return this.matchService.getJobExceptions(req.organizationId, id);
  }

  @Get(':id/summary')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get job summary' })
  async getJobSummary(@Request() req: any, @Param('id') id: string) {
    return this.matchService.getJobSummary(req.organizationId, id);
  }

  @Post(':id/resolve-exception')
  @UseGuards(ApiKeyAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an exception' })
  async resolveException(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.matchService.resolveException(req.organizationId, id, body);
  }

  @Post('import')
  @UseGuards(ApiKeyAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import expected payments' })
  async importExpectedPayments(@Request() req: any, @Body() body: any) {
    return this.matchService.importExpectedPayments(req.organizationId, body);
  }
}
