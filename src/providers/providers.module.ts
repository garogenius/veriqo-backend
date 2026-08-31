import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderRouterService } from './provider-router.service';
import { MockProviderService } from './adapters/mock-provider.service';
import { ProvidersController } from './providers.controller';

@Module({
  providers: [
    ProviderRegistryService,
    ProviderRouterService,
    MockProviderService,
  ],
  controllers: [ProvidersController],
  exports: [ProviderRouterService, ProviderRegistryService],
})
export class ProvidersModule {}
