import { Injectable } from '@nestjs/common';
import { FinancialProvider, ProviderHealth } from '../interfaces/financial-provider.interface';
import { ProviderCapability } from '../interfaces/provider-capabilities.enum';

@Injectable()
export class MockProviderService implements FinancialProvider {
  readonly id = 'MOCK';
  readonly name = 'Mock Provider';
  readonly environment = 'SANDBOX';
  
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

  async connect(organizationId: string, credentials: any): Promise<{ success: boolean, token?: string, error?: string }> {
    return { success: true, token: 'mock_token_123' };
  }

  async disconnect(connectionId: string): Promise<boolean> {
    return true;
  }

  async reconnect(connectionId: string): Promise<{ success: boolean, token?: string, error?: string }> {
    return { success: true, token: 'mock_token_456' };
  }

  async sync(connectionId: string, cursor?: string): Promise<{ success: boolean, nextCursor?: string, newTransactions?: any[] }> {
    return { success: true, nextCursor: 'cursor_abc', newTransactions: [] };
  }

  async getAccounts(connectionId: string): Promise<any[]> {
    return [
      { id: 'acc_1', name: 'Mock Checking', balance: 1000, currency: 'USD' }
    ];
  }

  async getAccountDetails(connectionId: string, accountId: string): Promise<any> {
    return { id: accountId, name: 'Mock Checking', balance: 1000, currency: 'USD' };
  }
}
