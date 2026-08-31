import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { ProofService } from './proof.service';
import { CreateProofDto } from './dto/create-proof.dto';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';

@ApiTags('Verification')
@Controller('v1/proofs')
export class ProofController {
  constructor(private readonly proofService: ProofService) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('ApiKey')
  @UseGuards(ApiKeyAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Create a verifiable representation of a completed financial verification' })
  @ApiHeader({ name: 'Idempotency-Key', description: 'Unique key to prevent duplicate operations', required: false })
  @ApiResponse({ status: 200, description: 'Successful proof creation.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createProof(@Body() createProofDto: CreateProofDto) {
    return this.proofService.createProof(createProofDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Public endpoint to verify a proof' })
  @ApiResponse({ status: 200, description: 'Proof retrieved securely.' })
  async getProof(@Param('id') id: string) {
    // This is public/semi-public and does not use ApiKeyAuthGuard
    return this.proofService.getProof(id);
  }
}
