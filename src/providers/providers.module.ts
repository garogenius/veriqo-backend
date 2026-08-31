import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderRouterService } from './provider-router.service';
import { MockProviderService } from './adapters/mock-provider.service';

@Module({
  providers: [
    ProviderRegistryService,
    ProviderRouterService,
    MockProviderService,
  ],
  exports: [ProviderRouterService, ProviderRegistryService],
})
export class ProvidersModule {}
