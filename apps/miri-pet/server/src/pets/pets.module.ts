import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { MediaModule } from '../media/media.module'
import { PetsController } from './pets.controller'
import { PetsService } from './pets.service'
import { UserPetsController } from './user-pets.controller'

@Module({
  imports: [AuthModule, MediaModule, EventsModule],
  controllers: [PetsController, UserPetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
