import { Injectable } from '@nestjs/common';
import { 
  ProviderInterface, 
  AccountResolutionRequest, 
  AccountResolutionResponse, 
  TransactionVerificationRequest, 
  TransactionVerificationResponse 
} from './provider.interface';

@Injectable()
export class MockProvider implements ProviderInterface {
  getName(): string {
    return 'MockProvider';
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }

  async resolveAccount(request: AccountResolutionRequest): Promise<AccountResolutionResponse> {
    // Deterministic Sandbox Responses
    if (request.account.number === '0123456789') {
      return {
        status: 'RESOLVED',
        account: { masked_number: '******6789', account_name: 'John Doe' },
        institution: { name: 'Example Bank', code: request.institution.code },
      };
    } else if (request.account.number === '9999999999') {
      return { status: 'FAILED' };
    }

    return {
      status: 'PENDING'
    };
  }

  async verifyTransaction(request: TransactionVerificationRequest): Promise<TransactionVerificationResponse> {
    if (request.amount === 250000) {
      return {
        status: 'VERIFIED',
        transaction: {
          amount: request.amount,
          currency: request.currency,
          reference: request.reference,
        }
      };
    } else if (request.amount === 10) {
      return { status: 'FAILED' };
    }

    return { status: 'REQUIRES_REVIEW' };
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
    return { success: true, nextCursor: 'cursor_mock', newTransactions: [] };
  }

  async getAccounts(connectionId: string): Promise<any[]> {
    return [
      { id: 'acc_mock', name: 'Mock Checking', balance: 1000, currency: 'USD' }
    ];
  }

  async getAccountDetails(connectionId: string, accountId: string): Promise<any> {
    return { id: accountId, name: 'Mock Checking', balance: 1000, currency: 'USD' };
  }
}
