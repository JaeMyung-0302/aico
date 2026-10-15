import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { MediaModule } from '../media/media.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PetsModule } from '../pets/pets.module'
import { VaccinationReminderCron } from './vaccination-reminder.cron'
import { VaccinationReminderService } from './vaccination-reminder.service'
import { VaccinationsController } from './vaccinations.controller'
import { VaccinationsService } from './vaccinations.service'

@Module({
  imports: [AuthModule, PetsModule, MediaModule, NotificationsModule, EventsModule],
  controllers: [VaccinationsController],
  providers: [VaccinationsService, VaccinationReminderService, VaccinationReminderCron],
  exports: [VaccinationReminderService],
})
export class VaccinationsModule {}
