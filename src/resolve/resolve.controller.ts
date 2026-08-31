import { Controller, Post, Body, UseGuards, UseInterceptors, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ResolveService } from './resolve.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';

@ApiTags('Verification')
@ApiSecurity('ApiKey')
@Controller('v1/accounts')
export class ResolveController {
  constructor(private readonly resolveService: ResolveService) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Resolve financial account information' })
  @ApiHeader({ name: 'Idempotency-Key', description: 'Unique key to prevent duplicate operations', required: false })
  @ApiResponse({ status: 200, description: 'Successful account resolution.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resolveAccount(@Request() req: any, @Body() resolveAccountDto: ResolveAccountDto) {
    return this.resolveService.resolveAccount(req.organizationId, req.apiKey.environment, resolveAccountDto);
  }
}
