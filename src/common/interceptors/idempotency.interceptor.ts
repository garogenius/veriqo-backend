import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ConflictException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
// In a real scenario, this would use Redis. We'll use a simple in-memory map for the Phase 2 foundation.
const idempotencyStore = new Map<string, any>();

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Only apply to POST/PATCH/PUT
    if (request.method === 'GET' || request.method === 'DELETE') {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      // It's optional for now, but could be strictly enforced for specific routes.
      return next.handle();
    }

    const organizationId = request.organizationId; // Must be set by ApiKeyAuthGuard or JwtAuthGuard
    if (!organizationId) {
      return next.handle();
    }

    const cacheKey = `${organizationId}:${idempotencyKey}`;
    const cachedResponse = idempotencyStore.get(cacheKey);

    if (cachedResponse) {
      // If it's a 'PROCESSING' placeholder, we could throw a 409 Conflict.
      if (cachedResponse === 'PROCESSING') {
        throw new ConflictException('A request with this Idempotency-Key is currently being processed.');
      }
      return of(cachedResponse);
    }

    // Mark as processing
    idempotencyStore.set(cacheKey, 'PROCESSING');

    return next.handle().pipe(
      tap((response) => {
        // Cache the successful response
        idempotencyStore.set(cacheKey, response);
      })
    );
  }
}
