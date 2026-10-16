import { NestFactory } from '@nestjs/core'
import { AdminModule } from '../../src/admin/admin.module'

// 운영자 CLI(admin.cli.ts)는 HTTP 앱과 별개인 standalone 컨텍스트로 뜬다.
// 컨트롤러 가드(UserThrottleGuard)가 쓰는 ThrottlerStorage까지 이 컨텍스트에서 풀려야 한다
describe('운영자 CLI 컨텍스트 (실DB)', () => {
  it('AdminModule이 의존성 오류 없이 뜬다', async () => {
    const context = await NestFactory.createApplicationContext(AdminModule, { logger: false, abortOnError: false })
    await context.close()
  })
})
