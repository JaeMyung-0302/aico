import type { INestApplication } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test, type TestingModuleBuilder } from '@nestjs/testing'
import { AppModule } from '../../src/app.module'
import { configureApp } from '../../src/bootstrap/configure-app'

type Override = (builder: TestingModuleBuilder) => TestingModuleBuilder

// main.ts와 같은 전역 설정(prefix·helmet·filter·requestId)으로 앱을 띄운다. 외부 연동만 override로 교체한다
export const createTestApp = async (override: Override = (builder) => builder): Promise<INestApplication> => {
  const moduleRef = await override(Test.createTestingModule({ imports: [AppModule] })).compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>()
  configureApp(app)
  await app.init()
  return app
}
