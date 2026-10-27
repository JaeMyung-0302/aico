import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'

// invite_created·couple_paired는 CouplesModule이 EventsService.record로 남긴다
@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
