import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'

describe('GET /config (원격 기능 플래그)', () => {
  let app: INestApplication
  let restoreEnv: () => void

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_GPS_LOCATION: undefined })
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  it('로그인 없이 조회되고, 위치기반서비스 신고 전 기본값은 isGpsEnabled=false', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/config').expect(200)
    expect(res.body).toEqual({ isGpsEnabled: false })
  })
})
