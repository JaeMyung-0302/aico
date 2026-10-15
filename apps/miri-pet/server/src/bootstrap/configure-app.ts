import { ConfigService } from '@nestjs/config'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { GlobalExceptionFilter } from '../common/filters/http-exception.filter'
import { requestIdMiddleware } from '../common/middleware/request-id.middleware'
import { requestContextMiddleware } from '../common/request-context/request-context'
import { legalPagesMiddleware } from './legal-pages'

export const API_PREFIX = 'api/v1'

// main.ts와 통합 테스트가 같은 전역 설정을 쓰도록 한 곳에 모은다
export const configureApp = (app: NestExpressApplication): void => {
  // 프록시 홉 수만큼 X-Forwarded-For를 신뢰 → req.ip가 실제 클라이언트가 된다(rate limit 키)
  app.set('trust proxy', app.get(ConfigService).get<number>('trustProxyHops') ?? 0)
  app.use(requestIdMiddleware)
  app.use(helmet())
  app.use(requestContextMiddleware)
  app.use(legalPagesMiddleware)
  app.setGlobalPrefix(API_PREFIX)
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.enableShutdownHooks()
}
