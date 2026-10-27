// Sentry 계측은 다른 모든 import보다 먼저 (SENTRY_DSN 없으면 no-op)
import './instrument'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { configureApp } from './bootstrap/configure-app'

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  configureApp(app)
  const port = app.get(ConfigService).get<number>('port', 4009)
  await app.listen(port)
  Logger.log(`You-In-Heart API running on http://localhost:${port}/api/v1`, 'Bootstrap')
}

bootstrap().catch((error) => {
  Logger.error('Fatal bootstrap error', error instanceof Error ? error.stack : String(error), 'Bootstrap')
  process.exit(1)
})
