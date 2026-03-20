import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { TenantsModule } from './tenants/tenants.module'
import { GeminiModule } from './gemini/gemini.module'
import { IntegrationsModule } from './integrations/integrations.module'
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module'
import { ChatModule } from './chat/chat.module'
import { WebhooksModule } from './webhooks/webhooks.module'
import { ChecklistsModule } from './checklists/checklists.module'
import { DashboardModule } from './dashboard/dashboard.module'
import configuration from './config/configuration'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    GeminiModule,
    IntegrationsModule,
    KnowledgeBaseModule,
    ChatModule,
    WebhooksModule,
    ChecklistsModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
