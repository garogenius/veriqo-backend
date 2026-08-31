import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { FinancialProvider } from './interfaces/financial-provider.interface';
import { ProviderCapability } from './interfaces/provider-capabilities.enum';

export interface RouteRequest {
  capability: ProviderCapability;
  country?: string;
  preferredProviderId?: string;
}

@Injectable()
export class ProviderRouterService {
  private readonly logger = new Logger(ProviderRouterService.name);

  constructor(private readonly registry: ProviderRegistryService) {}

  /**
   * Routes a request to the most appropriate financial provider based on capabilities, 
   * country support, and health status.
   */
  async route(request: RouteRequest): Promise<FinancialProvider> {
    const candidates = this.registry.getProvidersByCapability(request.capability);

    if (candidates.length === 0) {
      throw new BadRequestException(`No provider available for capability: ${request.capability}`);
    }

    // Filter by country if specified
    let availableProviders = candidates;
    if (request.country) {
      availableProviders = candidates.filter(p => p.supportedCountries.includes(request.country!));
    }

    if (availableProviders.length === 0) {
      throw new BadRequestException(`No provider available in country ${request.country} for capability ${request.capability}`);
    }

    // If the user/org requested a specific provider and it meets the criteria, try to use it
    if (request.preferredProviderId) {
      const preferred = availableProviders.find(p => p.id === request.preferredProviderId);
      if (preferred) {
        // Ideally, check health here before returning
        return preferred;
      } else {
        this.logger.warn(`Preferred provider '${request.preferredProviderId}' not suitable/available. Falling back.`);
      }
    }

    // Fallback logic: check health and pick the first healthy provider
    for (const provider of availableProviders) {
      try {
        const health = await provider.checkHealth();
        if (health.status === 'HEALTHY') {
          return provider;
        }
      } catch (err) {
        this.logger.error(`Health check failed for provider ${provider.id}`, err);
      }
    }

    throw new BadRequestException('All capable providers are currently unhealthy or unavailable.');
  }
}
