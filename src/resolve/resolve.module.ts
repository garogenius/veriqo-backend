import { Module } from '@nestjs/common';
import { ResolveController } from './resolve.controller';
import { ResolveService } from './resolve.service';
import { MockProvider } from '../providers/mock.provider';

@Module({
  controllers: [ResolveController],
  providers: [ResolveService, MockProvider],
})
export class ResolveModule {}
