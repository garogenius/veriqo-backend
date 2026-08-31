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
  resolveAccount(request: AccountResolutionRequest): Promise<AccountResolutionResponse>;
  verifyTransaction(request: TransactionVerificationRequest): Promise<TransactionVerificationResponse>;
}
