import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { configuration } from '../config/configuration'
import { NotificationsModule } from '../notifications/notifications.module'
import { PrismaModule } from '../prisma/prisma.module'
import { VaccinationReminderService } from './vaccination-reminder.service'

// 운영자 CLI(reminders:run-now) 전용 standalone 컨텍스트: 크론·부팅 실행 없이 리마인더 서비스만 띄운다
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), PrismaModule, NotificationsModule],
  providers: [VaccinationReminderService],
})
export class ReminderRunnerModule {}
