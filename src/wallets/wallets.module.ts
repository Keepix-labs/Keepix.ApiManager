import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [SharedModule],
  controllers: [WalletsController],
  providers: [],
})
export class WalletsModule {}
