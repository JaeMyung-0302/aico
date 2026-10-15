import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './setup-app'

describe('GET /legal/* 약관 초안', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it.each(['terms', 'privacy', 'location', 'privacy.html'])('/legal/%s → 200 HTML (초안)', async (doc) => {
    const res = await request(app.getHttpServer()).get(`/legal/${doc}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.text).toContain('초안')
  })

  it('목록에 없는 문서는 404', async () => {
    await request(app.getHttpServer()).get('/legal/secret').expect(404)
  })
})
