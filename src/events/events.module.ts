import { Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [OutboxRelayService],
})
export class EventsModule {}
