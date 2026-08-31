import { Controller, Get, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProviderRegistryService } from './provider-registry.service';

@ApiTags('Providers')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/providers')
export class ProvidersController {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List all available providers' })
  async getProviders() {
    const providers = Array.from(this.providerRegistry['providers'].values());
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      capabilities: p.capabilities,
      environment: p.environment
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific provider' })
  async getProvider(@Param('id') id: string) {
    const provider = this.providerRegistry.getProvider(id);
    if (!provider) throw new NotFoundException('Provider not found');
    return {
      id: provider.id,
      name: provider.name,
      capabilities: provider.capabilities,
      environment: provider.environment
    };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get the health status of a provider' })
  async getProviderStatus(@Param('id') id: string) {
    const provider = this.providerRegistry.getProvider(id);
    if (!provider) throw new NotFoundException('Provider not found');
    
    // In a real implementation, this would ping the provider's /health endpoint
    // For now, we mock the status based on the provider id.
    const statuses = ['ACTIVE', 'DEGRADED', 'DOWN', 'MAINTENANCE'];
    // Predictable status for mock providers
    const status = id === 'MOCK_DOWN' ? 'DOWN' : 'ACTIVE';

    return {
      id: provider.id,
      status,
      lastCheckedAt: new Date(),
    };
  }
}
