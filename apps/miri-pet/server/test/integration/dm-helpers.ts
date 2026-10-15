import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { bearer } from './auth-helpers'

// DM 통합 테스트 공통: REST 호출 래퍼
export const dmApi = (app: INestApplication) => {
  const http = () => request(app.getHttpServer())
  const base = '/api/v1/dm/conversations'
  return {
    follow: (token: string, userId: string) =>
      http()
        .put(`/api/v1/users/${userId}/follow`)
        .set(...bearer(token)),
    block: (token: string, userId: string) =>
      http()
        .post(`/api/v1/blocks/${userId}`)
        .set(...bearer(token)),
    open: (token: string, userId: string) =>
      http()
        .post(base)
        .set(...bearer(token))
        .send({ userId }),
    list: (token: string, state: 'ACCEPTED' | 'REQUEST' = 'ACCEPTED', extra = '') =>
      http()
        .get(`${base}?state=${state}${extra}`)
        .set(...bearer(token)),
    get: (token: string, conversationId: string) =>
      http()
        .get(`${base}/${conversationId}`)
        .set(...bearer(token)),
    accept: (token: string, conversationId: string) =>
      http()
        .post(`${base}/${conversationId}/accept`)
        .set(...bearer(token)),
    leave: (token: string, conversationId: string) =>
      http()
        .delete(`${base}/${conversationId}`)
        .set(...bearer(token)),
    send: (
      token: string,
      conversationId: string,
      body: { body?: string; mediaId?: string; clientMessageId?: string } = { body: '안녕하세요' },
    ) =>
      http()
        .post(`${base}/${conversationId}/messages`)
        .set(...bearer(token))
        .send({ clientMessageId: body.clientMessageId ?? randomUUID(), ...body }),
    messages: (token: string, conversationId: string, query = '') =>
      http()
        .get(`${base}/${conversationId}/messages${query}`)
        .set(...bearer(token)),
    read: (token: string, conversationId: string, lastReadMessageId: string) =>
      http()
        .post(`${base}/${conversationId}/read`)
        .set(...bearer(token))
        .send({ lastReadMessageId }),
    report: (token: string, messageId: string) =>
      http()
        .post('/api/v1/reports')
        .set(...bearer(token))
        .send({ targetType: 'MESSAGE', targetId: messageId, reason: 'SPAM' }),
  }
}

export type DmApi = ReturnType<typeof dmApi>
