import { DynamicModule, Module } from '@nestjs/common';
import { EthProofOfStakeController } from './eth-proof-of-stake.controller';
import { EthProofOfStakeService } from './eth-proof-of-stake.service';
import { SharedModule } from 'src/shared/shared.module';

export const pluginInformations = {
  title: 'Ethereum',
  subTitle: 'Staking'
};

export const register = (): DynamicModule => {
    return {
      module: class {},
      imports: [SharedModule],
      controllers: [EthProofOfStakeController],
      providers: [EthProofOfStakeService],
      exports: [EthProofOfStakeService],
    };
}