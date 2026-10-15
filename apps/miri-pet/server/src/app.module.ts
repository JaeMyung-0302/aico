import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { type ClientIpSource, resolveClientIp } from './common/throttle/client-ip'
import { configuration } from './config/configuration'
import { DmModule } from './dm/dm.module'
import { EventsModule } from './events/events.module'
import { HealthModule } from './health/health.module'
import { MediaModule } from './media/media.module'
import { ModerationModule } from './moderation/moderation.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PetsModule } from './pets/pets.module'
import { PlacesModule } from './places/places.module'
import { PostsModule } from './posts/posts.module'
import { PrismaModule } from './prisma/prisma.module'
import { SocialModule } from './social/social.module'
import { UsersModule } from './users/users.module'
import { VaccinationsModule } from './vaccinations/vaccinations.module'

const THROTTLE_TTL_MS = 60_000
const THROTTLE_LIMIT = 120

// 프록시 뒤에서도 클라이언트별 버킷이 되도록 tracker를 cf-connecting-ip / req.ip로 정한다
const throttlerOptions = (config: ConfigService) => {
  const trustProxyHops = config.get<number>('trustProxyHops') ?? 0
  return {
    throttlers: [{ ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT }],
    getTracker: (req: ClientIpSource) => resolveClientIp(req, trustProxyHops),
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({ inject: [ConfigService], useFactory: throttlerOptions }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PetsModule,
    VaccinationsModule,
    MediaModule,
    PlacesModule,
    PostsModule,
    SocialModule,
    DmModule,
    NotificationsModule,
    ModerationModule,
    EventsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
