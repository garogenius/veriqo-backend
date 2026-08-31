import { Controller, Post, Get, Body, Param, Query, UseGuards, UseInterceptors, HttpCode, HttpStatus, Request } from '@nestjs/common';
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
  async createProof(@Request() req: any, @Body() createProofDto: CreateProofDto) {
    return this.proofService.createProof(req.organizationId, createProofDto);
  }

  @Get()
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List proofs' })
  async getProofs(@Request() req: any, @Query() query: any) {
    return this.proofService.findAll(req.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Public endpoint to view a proof' })
  @ApiResponse({ status: 200, description: 'Proof retrieved securely.' })
  async getProof(@Param('id') id: string) {
    // This is public/semi-public and does not use ApiKeyAuthGuard
    return this.proofService.getProof(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Public endpoint to verify proof integrity' })
  @ApiResponse({ status: 200, description: 'Proof verified.' })
  async verifyProof(@Param('id') id: string) {
    return this.proofService.verifyIntegrity(id);
  }
}
