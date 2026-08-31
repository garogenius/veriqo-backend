import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { FinancialProvider } from './interfaces/financial-provider.interface';
import { ProviderCapability } from './interfaces/provider-capabilities.enum';
import { MockProviderService } from './adapters/mock-provider.service';

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers: Map<string, FinancialProvider> = new Map();

  constructor(private readonly mockProvider: MockProviderService) {}

  onModuleInit() {
    this.registerProvider(this.mockProvider);
    this.logger.log(`Registered ${this.providers.size} financial providers.`);
  }

  private registerProvider(provider: FinancialProvider) {
    if (this.providers.has(provider.id)) {
      this.logger.warn(`Provider ${provider.id} is already registered. Overwriting.`);
    }
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): FinancialProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new NotFoundException(`Provider with ID '${id}' not found in registry.`);
    }
    return provider;
  }

  getAllProviders(): FinancialProvider[] {
    return Array.from(this.providers.values());
  }

  getProvidersByCapability(capability: ProviderCapability): FinancialProvider[] {
    return this.getAllProviders().filter(p => p.capabilities.includes(capability));
  }
}
