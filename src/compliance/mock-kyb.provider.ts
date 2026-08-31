import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MockKybProvider {
  private readonly logger = new Logger(MockKybProvider.name);

  /**
   * Simulates submitting business documents to a KYB Provider (Rule 262)
   */
  async verifyBusiness(legalName: string, registrationNo: string, country: string): Promise<{ status: string }> {
    this.logger.log(`Submitting KYB verification to Mock Provider for ${legalName} (${country})`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock logic: If the name contains "Reject", simulate a failure
    if (legalName.toLowerCase().includes('reject')) {
      return { status: 'REJECTED' };
    }

    return { status: 'VERIFIED' };
  }
}
