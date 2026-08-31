import { Module } from '@nestjs/common';
import { ResolveController } from './resolve.controller';
import { ResolveService } from './resolve.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [PrismaModule, ProvidersModule],
  controllers: [ResolveController],
  providers: [ResolveService],
})
export class ResolveModule {}
