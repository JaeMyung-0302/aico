import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { configuration } from '../config/configuration'
import { ModerationModule } from '../moderation/moderation.module'
import { PlacesModule } from '../places/places.module'
import { PrismaModule } from '../prisma/prisma.module'

// 운영자 CLI 전용 standalone 컨텍스트(HTTP 서버·스케줄러 없이)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    ModerationModule,
    PlacesModule,
  ],
})
export class AdminModule {}
