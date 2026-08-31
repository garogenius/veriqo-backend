import { Controller, Get, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';

@ApiTags('Transactions')
@Controller('v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'List transactions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getTransactions(@Request() req: any, @Query() query: any) {
    return this.transactionsService.findAll(req.organizationId, query);
  }

  @Get(':id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiOperation({ summary: 'Get a specific transaction by ID' })
  async getTransaction(@Request() req: any, @Param('id') id: string) {
    const transaction = await this.transactionsService.findById(req.organizationId, id);
    if (!transaction) throw new NotFoundException('Transaction not found');
    return { data: transaction };
  }
}
