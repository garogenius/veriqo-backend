import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { MockKybProvider } from './mock-kyb.provider';
import { ComplianceController } from './compliance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, MockKybProvider],
  exports: [ComplianceService],
})
export class ComplianceModule { }
