import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) { }

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

    // Attach the api key details to the request for downstream processing
    request.apiKey = apiKey;
    request.organizationId = (apiKey as any).apiClient.organizationId;

    return true;
  }
}
