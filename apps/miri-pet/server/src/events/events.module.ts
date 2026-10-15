import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPosthogClient, EventsService, POSTHOG_CLIENT } from './events.service'

@Module({
  providers: [EventsService, { provide: POSTHOG_CLIENT, inject: [ConfigService], useFactory: createPosthogClient }],
  exports: [EventsService],
})
export class EventsModule {}
