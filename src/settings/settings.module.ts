import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [SettingsController],
  providers: [],
})
export class SettingsModule {}
