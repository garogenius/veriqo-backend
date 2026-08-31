import { ProviderCapability } from './provider-capabilities.enum';

export interface ProviderHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
  latencyMs: number;
  lastCheckedAt: Date;
}

export interface FinancialProvider {
  /**
   * Unique identifier for the provider (e.g., 'MOCK', 'PLAID', 'MONO')
   */
  readonly id: string;

  /**
   * List of capabilities supported by this provider
   */
  readonly capabilities: ProviderCapability[];

  /**
   * Supported ISO 3166-1 alpha-2 country codes
   */
  readonly supportedCountries: string[];

  /**
   * Checks if the provider is currently healthy
   */
  checkHealth(): Promise<ProviderHealth>;

  // Future Methods:
  // connect(params: any): Promise<any>;
  // disconnect(connectionId: string): Promise<void>;
  // getAccounts(connectionId: string): Promise<any[]>;
  // getTransactions(connectionId: string, cursor?: string): Promise<any>;
}
