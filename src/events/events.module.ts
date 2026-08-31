import { Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EventsController],
  providers: [OutboxRelayService],
})
export class EventsModule {}
