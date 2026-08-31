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
  readonly name: string;
  readonly environment: string;

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

  // Connection Lifecycle
  connect(organizationId: string, credentials: any): Promise<{ success: boolean, token?: string, error?: string }>;
  disconnect(connectionId: string): Promise<boolean>;
  reconnect(connectionId: string): Promise<{ success: boolean, token?: string, error?: string }>;
  sync(connectionId: string, cursor?: string): Promise<{ success: boolean, nextCursor?: string, newTransactions?: any[] }>;
  
  // Financial Data
  getAccounts(connectionId: string): Promise<any[]>;
  getAccountDetails(connectionId: string, accountId: string): Promise<any>;
  
  // Resolution & Verification
  resolveAccount?(request: any): Promise<any>;
  verifyTransaction?(request: any): Promise<any>;
}
