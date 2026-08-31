import { Global, Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Global()
@Module({
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
