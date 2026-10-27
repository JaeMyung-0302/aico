import type { INestApplication, ModuleMetadata } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test, type TestingModuleBuilder } from '@nestjs/testing'
import { AppModule } from '../../src/app.module'
import { configureApp } from '../../src/bootstrap/configure-app'

type Override = (builder: TestingModuleBuilder) => TestingModuleBuilder

// 테스트 전용 모듈·컨트롤러(라우트 탐색, 프로브 라우트)를 AppModule 옆에 붙일 때 쓴다
type Extra = Pick<ModuleMetadata, 'imports' | 'controllers'>

// main.ts와 같은 전역 설정(prefix·helmet·filter·requestId)으로 앱을 띄운다. 외부 연동만 override로 교체한다
export const createTestApp = async (
  override: Override = (builder) => builder,
  extra: Extra = {},
): Promise<INestApplication> => {
  const metadata = { imports: [AppModule, ...(extra.imports ?? [])], controllers: extra.controllers ?? [] }
  const moduleRef = await override(Test.createTestingModule(metadata)).compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>()
  configureApp(app)
  await app.init()
  return app
}
