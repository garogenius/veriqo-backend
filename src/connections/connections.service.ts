import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRouterService } from '../providers/provider-router.service';
import { ConnectionStatus, FinancialConnection, ApiEnvironment } from '@prisma/client';
import { ProviderCapability } from '../providers/interfaces/provider-capabilities.enum';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRouter: ProviderRouterService,
  ) {}

  /**
   * Initializes a new provider connection sequence.
   */
  async createConnection(organizationId: string, providerId: string, environment: ApiEnvironment): Promise<FinancialConnection> {
    // 1. Verify the requested provider actually supports banking/connections
    const provider = await this.providerRouter.route({
      capability: ProviderCapability.ACCOUNT_DATA,
      preferredProviderId: providerId,
    });

    // 2. Create the database record tracking the OAuth/Auth state
    return this.prisma.financialConnection.create({
      data: {
        organizationId,
        provider: provider.id,
        environment,
        status: ConnectionStatus.CREATED,
      },
    });
  }

  async getConnection(connectionId: string, organizationId: string): Promise<FinancialConnection> {
    const conn = await this.prisma.financialConnection.findUnique({
      where: { id: connectionId, organizationId },
    });
    if (!conn) throw new NotFoundException('Connection not found');
    return conn;
  }

  /**
   * Simulates the OAuth callback completing.
   */
  async authorizeConnection(connectionId: string, organizationId: string, fakeToken: string): Promise<FinancialConnection> {
    const conn = await this.getConnection(connectionId, organizationId);
    
    return this.prisma.financialConnection.update({
      where: { id: conn.id },
      data: {
        status: ConnectionStatus.AUTHORIZED,
        accessToken: fakeToken, // In production, this would be encrypted before storage
      },
    });
  }

  /**
   * Marks a connection as active after initial sync.
   */
  async markActive(connectionId: string): Promise<FinancialConnection> {
    return this.prisma.financialConnection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.ACTIVE },
    });
  }

  /**
   * Updates the synchronization cursor for incremental fetches.
   */
  async updateSyncCursor(connectionId: string, cursor: string): Promise<void> {
    await this.prisma.financialConnection.update({
      where: { id: connectionId },
      data: { 
        syncCursor: cursor,
        lastSyncAt: new Date(),
      },
    });
  }
}
