import { Injectable } from '@nestjs/common';
import { FinancialProvider, ProviderHealth } from '../interfaces/financial-provider.interface';
import { ProviderCapability } from '../interfaces/provider-capabilities.enum';

@Injectable()
export class MockProviderService implements FinancialProvider {
  readonly id = 'MOCK';
  
  readonly capabilities = [
    ProviderCapability.ACCOUNT_RESOLUTION,
    ProviderCapability.ACCOUNT_DATA,
    ProviderCapability.TRANSACTION_DATA,
    ProviderCapability.BALANCE_DATA,
    ProviderCapability.TRANSACTION_VERIFICATION,
  ];

  readonly supportedCountries = ['US', 'NG', 'GB'];

  async checkHealth(): Promise<ProviderHealth> {
    // The mock provider is always healthy
    return {
      status: 'HEALTHY',
      latencyMs: Math.floor(Math.random() * 50) + 10, // Simulate 10-60ms latency
      lastCheckedAt: new Date(),
    };
  }
}
