import { Module } from '@nestjs/common';
import { UpgradesController } from './upgrades.controller';
import { UpgradesService } from './upgrades.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UpgradesController],
  providers: [UpgradesService],
})
export class UpgradesModule {}
