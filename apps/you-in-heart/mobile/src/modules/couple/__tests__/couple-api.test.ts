import { consentsSchema, coupleSchema, createInviteResponseSchema, meResponseSchema } from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'
import { deleteMe, fetchMe, putConsents, updateMe } from '@/modules/user/data-access-me/me-api'
import {
  createInvite,
  fetchCouple,
  joinCouple,
  reconnectCouple,
  unlinkCouple,
  updateStartedOn,
} from '../data-access-couple/couple-api'

// 네트워크 진입점만 대체한다 — 경로·본문·응답 스키마 계약을 고정한다(0E 서버 라우트)
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

beforeEach(() => jest.clearAllMocks())

describe('couple-api', () => {
  it.each([
    [
      'createInvite',
      () => createInvite(),
      { method: 'POST', url: '/couples/invites', schema: createInviteResponseSchema },
    ],
    [
      'joinCouple',
      () => joinCouple('K7MQ2X'),
      { method: 'POST', url: '/couples/join', data: { code: 'K7MQ2X' }, schema: coupleSchema },
    ],
    ['fetchCouple', () => fetchCouple(), { method: 'GET', url: '/couples/me', schema: coupleSchema }],
    [
      'updateStartedOn',
      () => updateStartedOn('2025-09-10'),
      { method: 'PATCH', url: '/couples/me', data: { startedOn: '2025-09-10' }, schema: coupleSchema },
    ],
    ['unlinkCouple', () => unlinkCouple(), { method: 'POST', url: '/couples/me/unlink', schema: coupleSchema }],
    [
      'reconnectCouple',
      () => reconnectCouple(),
      { method: 'POST', url: '/couples/me/reconnect', schema: coupleSchema },
    ],
  ])('%s', async (_, call, expected) => {
    await call()
    expect(requestApi).toHaveBeenCalledWith(expected)
  })
})

describe('me-api', () => {
  it.each([
    ['fetchMe', () => fetchMe(), { method: 'GET', url: '/me', schema: meResponseSchema }],
    [
      'updateMe',
      () => updateMe({ displayName: '재명' }),
      { method: 'PATCH', url: '/me', data: { displayName: '재명' }, schema: meResponseSchema },
    ],
    [
      'putConsents',
      () => putConsents({ terms: true, privacy: true, location: false }),
      {
        method: 'PUT',
        url: '/me/consents',
        data: { terms: true, privacy: true, location: false },
        schema: consentsSchema,
      },
    ],
    ['deleteMe', () => deleteMe(), { method: 'DELETE', url: '/me' }],
  ])('%s', async (_, call, expected) => {
    await call()
    expect(requestApi).toHaveBeenCalledWith(expected)
  })
})
