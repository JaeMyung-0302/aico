import { Module } from '@nestjs/common'
import { DailyController } from './daily.controller'
import { DailyService } from './daily.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [DailyController],
  providers: [DailyService],
})
export class DailyModule {}
