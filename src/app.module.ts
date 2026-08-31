import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ResolveModule } from './resolve/resolve.module';
import { VerifyModule } from './verify/verify.module';
import { MatchModule } from './match/match.module';
import { ProofModule } from './proof/proof.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ProvidersModule } from './providers/providers.module';
import { AdminModule } from './admin/admin.module';
import { ConnectionsModule } from './connections/connections.module';
import { TransactionsModule } from './transactions/transactions.module';
import { EventsModule } from './events/events.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ComplianceModule } from './compliance/compliance.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
// import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    ApiKeysModule,
    ProvidersModule,
    ResolveModule,
    VerifyModule,
    MatchModule,
    ProofModule,
    WebhooksModule,
    AdminModule,
    ConnectionsModule,
    TransactionsModule,
    EventsModule,
    SubscriptionsModule,
    ComplianceModule,
    AnalyticsModule,
    AuditModule,
    NotificationsModule,
    // ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: 60000, limit: 10 },
      { name: 'analytics', ttl: 60000, limit: 300 }
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
