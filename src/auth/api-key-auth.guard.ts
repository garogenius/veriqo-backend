import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private apiKeysService: ApiKeysService,
    private prisma: PrismaService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    const rawKey = authHeader.split(' ')[1];

    // In a real production system, you might want a small in-memory LRU cache here 
    // to prevent DB hits on every single request, or use Redis.
    const apiKey = await this.apiKeysService.validateKey(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    const organizationId = (apiKey as any).apiClient.organizationId;
    
    // Evaluate Subscription & Usage limits
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true }
    });

    if (!subscription || (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING')) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'SUBSCRIPTION_INACTIVE', message: 'The organization does not have an active subscription.' }
      });
    }

    const limit = subscription.plan.maxApiKeys; // For API keys limits we could check total keys, but for requests, let's track 'api_requests' usage.
    
    // For demonstration of usage limits, we record the api request
    try {
      await this.prisma.usageRecord.create({
        data: {
          organizationId,
          feature: 'api_requests',
          quantity: 1,
          idempotencyKey: `req_${randomUUID()}`
        }
      });
    } catch (error) {
      // Ignore unique constraint or record errors in auth guard gracefully
    }

    // Attach the api key details to the request for downstream processing
    request.apiKey = apiKey;
    request.organizationId = organizationId;

    return true;
  }
}
