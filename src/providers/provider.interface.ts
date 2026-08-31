export interface AccountResolutionRequest {
  country: string;
  institution: { code: string };
  account: { number: string };
}

export interface AccountResolutionResponse {
  status: 'RESOLVED' | 'FAILED' | 'PENDING';
  account?: { masked_number: string; account_name?: string };
  institution?: { name: string; code: string };
}

export interface TransactionVerificationRequest {
  amount: number;
  currency: string;
  reference: string;
  transactionIdentifier?: string;
}

export interface TransactionVerificationResponse {
  status: 'VERIFIED' | 'FAILED' | 'PENDING' | 'REQUIRES_REVIEW';
  transaction?: {
    amount: number;
    currency: string;
    reference: string;
  };
}

export interface ProviderInterface {
  getName(): string;
  checkHealth(): Promise<boolean>;
  
  // Account Resolution & Verification
  resolveAccount(request: AccountResolutionRequest): Promise<AccountResolutionResponse>;
  verifyTransaction(request: TransactionVerificationRequest): Promise<TransactionVerificationResponse>;
  
  // Connection Lifecycle
  connect(organizationId: string, credentials: any): Promise<{ success: boolean, token?: string, error?: string }>;
  disconnect(connectionId: string): Promise<boolean>;
  reconnect(connectionId: string): Promise<{ success: boolean, token?: string, error?: string }>;
  sync(connectionId: string, cursor?: string): Promise<{ success: boolean, nextCursor?: string, newTransactions?: any[] }>;
  
  // Financial Data
  getAccounts(connectionId: string): Promise<any[]>;
  getAccountDetails(connectionId: string, accountId: string): Promise<any>;
}
