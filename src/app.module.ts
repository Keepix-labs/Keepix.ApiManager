import { Module } from '@nestjs/common';
import { EthProofOfStakeController } from './plugin/eth-proof-of-stake/eth-proof-of-stake.controller';

@Module({
  imports: [],
  controllers: [EthProofOfStakeController],
  providers: [],
})
export class AppModule {}
