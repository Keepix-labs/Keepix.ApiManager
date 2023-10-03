import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [],
  controllers: [MonitoringController],
  providers: [],
})
export class MonitoringModule {}
