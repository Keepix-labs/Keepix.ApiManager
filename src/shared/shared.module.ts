import { Module } from '@nestjs/common';
import { BashService } from './bash.service';

@Module({
  controllers: [],
  providers: [BashService],
  exports: [BashService]
})
export class SharedModule {}
