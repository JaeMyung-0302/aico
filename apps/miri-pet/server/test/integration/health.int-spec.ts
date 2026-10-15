import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('GET /api/v1/health (실DB)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll(app.get(PrismaService))
  })

  afterAll(async () => {
    await app.close()
  })

  it('200과 db up 상태를 돌려준다', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' })
  })

  it('응답마다 x-request-id 헤더를 붙인다', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health')
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('요청의 x-request-id를 그대로 돌려준다', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').set('x-request-id', 'req-from-client-123')
    expect(res.headers['x-request-id']).toBe('req-from-client-123')
  })

  it('없는 경로는 404와 requestId를 담은 에러 본문을 돌려준다', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ statusCode: 404, requestId: res.headers['x-request-id'] })
  })
})
