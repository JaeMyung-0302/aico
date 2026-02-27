import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  app.use(helmet())
  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new GlobalExceptionFilter())

  const corsOrigins = configService.get<string>(
    'corsOrigins',
    'http://localhost:5175',
  )
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
  })

  const port = configService.get<number>('port', 4003)
  await app.listen(port)
  Logger.log(`SoulBlade API running on http://localhost:${port}`, 'Bootstrap')
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error)
  process.exit(1)
})
