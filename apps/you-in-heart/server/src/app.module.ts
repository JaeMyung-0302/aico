import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AnniversariesModule } from './anniversaries/anniversaries.module'
import { AuthModule } from './auth/auth.module'
import { type ClientIpSource, resolveClientIp } from './common/throttle/client-ip'
import { configuration } from './config/configuration'
import { CoupleGuard } from './couples/couple.guard'
import { CouplesModule } from './couples/couples.module'
import { EventsModule } from './events/events.module'
import { HealthModule } from './health/health.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

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
    NotificationsModule,
    CouplesModule,
    EventsModule,
    AnniversariesModule,
  ],
  // 순서대로 실행: IP throttle → CoupleGuard(기본 "커플 필수", @AllowWithoutCouple 예외) → 라우트 가드(@Authenticated 등)
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: CoupleGuard },
  ],
})
export class AppModule {}
