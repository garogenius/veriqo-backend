import { Global, Module } from '@nestjs/common';
import { MockProvider } from './mock.provider';
import { ProductionProvider } from './production.provider';
import { ProviderRouter } from './provider.router';

@Global()
@Module({
  providers: [MockProvider, ProductionProvider, ProviderRouter],
  exports: [ProviderRouter],
})
export class ProvidersModule {}
