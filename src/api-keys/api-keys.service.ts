import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEnvironment, ApiKey, ApiClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private generateKey(environment: ApiEnvironment): { rawKey: string, publicIdentifier: string, secretHash: string } {
    const prefix = environment === ApiEnvironment.PRODUCTION ? 'vrq_live_' : 'vrq_test_';
    const randomHex = randomBytes(32).toString('hex');
    const rawKey = `${prefix}${randomHex}`;
    
    const publicIdentifier = `${prefix}${randomHex.substring(0, 8)}`;
    const secretHash = createHash('sha256').update(rawKey).digest('hex');

    return { rawKey, publicIdentifier, secretHash };
  }

  async createClient(organizationId: string, createdById: string, data: { name: string, environment: ApiEnvironment, description?: string }): Promise<ApiClient> {
    return this.prisma.apiClient.create({
      data: {
        organizationId,
        createdById,
        name: data.name,
        environment: data.environment,
        description: data.description,
      }
    });
  }

  async createKey(apiClientId: string, scopes: string[] = []): Promise<{ key: ApiKey, rawSecret: string }> {
    const client = await this.prisma.apiClient.findUnique({ where: { id: apiClientId } });
    if (!client) throw new NotFoundException('API Client not found');

    const { rawKey, publicIdentifier, secretHash } = this.generateKey(client.environment);

    const key = await this.prisma.apiKey.create({
      data: {
        apiClientId,
        publicIdentifier,
        secretHash,
        environment: client.environment,
        scopes,
      }
    });

    return { key, rawSecret: rawKey }; // Return rawSecret ONLY ONCE
  }

  async validateKey(rawKey: string): Promise<ApiKey | null> {
    const secretHash = createHash('sha256').update(rawKey).digest('hex');
    const key = await this.prisma.apiKey.findFirst({
      where: { secretHash, status: 'ACTIVE' },
      include: { apiClient: true }
    });
    
    if (key) {
      // Async update last used
      this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() }
      }).catch(console.error);
    }

    return key;
  }

  async create(organizationId: string, dto: any): Promise<{ key: ApiKey, rawSecret: string }> {
    return this.createKey(dto.apiClientId, dto.scopes);
  }

  async findAll(organizationId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: {
        apiClient: {
          organizationId
        }
      }
    });
  }

  async revoke(organizationId: string, id: string): Promise<ApiKey> {
    // Note: ensure organization matches before revoking
    return this.prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED' }
    });
  }
}
