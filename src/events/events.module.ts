import { Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [OutboxRelayService, EventsService],
  exports: [EventsService]
})
export class EventsModule {}
