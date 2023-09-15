import { Module } from '@nestjs/common';
import { EthProofOfStakeController } from './plugin/eth-proof-of-stake/eth-proof-of-stake.controller';
import { BashService } from './utils/bash.service';

@Module({
  imports: [],
  controllers: [EthProofOfStakeController],
  providers: [BashService],
})
export class AppModule {}
