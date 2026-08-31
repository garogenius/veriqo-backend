import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super Admin bypasses all checks
    if (user.isSuperAdmin) {
      return true;
    }

    // In VERIQO, context is often bound to an organizationId
    // Either from a param :orgId, :id (if it's the org endpoint), or query, or body.
    // Assuming organizationId is injected into the request by a middleware, or we extract it from params:
    let orgId = request.params.orgId || request.body.organizationId || request.query.organizationId;
    
    // Fallback: If it's an organization specific route and ID is passed as :id
    if (!orgId && request.route.path.includes('/v1/organizations/:id')) {
      orgId = request.params.id;
    }
    
    // If we have an orgId, we check the user's role in that organization
    if (orgId) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: { userId: user.id, organizationId: orgId, status: 'ACTIVE' },
        include: { role: { include: { permissions: true } } }
      });

      if (!membership) {
        throw new ForbiddenException('You do not belong to this organization or your membership is inactive');
      }

      const userPermissions = membership.role.permissions.map(p => p.name);
      
      const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));
      if (!hasPermission) {
        throw new ForbiddenException('You do not have the required permissions');
      }

      // Inject the verified organization context onto the request
      request.organizationId = orgId;
      return true;
    }

    // If no orgId is present in the request, and this isn't a global route, fail safe.
    // We only enforce permissions if the route demands it.
    throw new ForbiddenException('Organization context required to verify permissions');
  }
}
