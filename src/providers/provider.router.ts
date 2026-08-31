import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProviderInterface, AccountResolutionRequest, AccountResolutionResponse, TransactionVerificationRequest, TransactionVerificationResponse } from './provider.interface';
import { MockProvider } from './mock.provider';
import { ProductionProvider } from './production.provider';

@Injectable()
export class ProviderRouter {
  constructor(
    private mockProvider: MockProvider,
    private productionProvider: ProductionProvider,
  ) {}

  private getProvider(environment: 'SANDBOX' | 'PRODUCTION'): ProviderInterface {
    if (environment === 'PRODUCTION') {
      return this.productionProvider;
    }
    return this.mockProvider;
  }

  async resolveAccount(environment: 'SANDBOX' | 'PRODUCTION', request: AccountResolutionRequest): Promise<AccountResolutionResponse> {
    const provider = this.getProvider(environment);
    return provider.resolveAccount(request);
  }

  async verifyTransaction(environment: 'SANDBOX' | 'PRODUCTION', request: TransactionVerificationRequest): Promise<TransactionVerificationResponse> {
    const provider = this.getProvider(environment);
    return provider.verifyTransaction(request);
  }
}
