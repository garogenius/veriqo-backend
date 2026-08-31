import { Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OutboxRelayService],
})
export class EventsModule {}
