import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { createInviteResponseSchema } from '@you-in-heart/shared'
import { ApiError, createRequestApi } from '../request-api'

const INVITE = { code: 'K7MQ2X', expiresAt: '2026-10-28T03:00:00.000Z' }

// 네트워크(axios adapter)만 대체한다 — request-api 자체는 mock 하지 않는다
const respondWith =
  (status: number, data: unknown): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
    }
    return response
  }

const failNetwork: AxiosAdapter = async (config) => {
  throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {})
}

const makeRequestApi = (adapter: AxiosAdapter) => createRequestApi(axios.create({ adapter }))

describe('requestApi', () => {
  it('성공 응답을 shared 스키마로 파싱해 돌려준다', async () => {
    const requestApi = makeRequestApi(respondWith(200, { ...INVITE, extra: 'ignored' }))
    const invite = await requestApi({ method: 'GET', url: '/couples/invites', schema: createInviteResponseSchema })
    expect(invite).toEqual(INVITE)
  })

  it('응답이 스키마와 다르면 ApiError(INVALID_RESPONSE)를 던진다', async () => {
    const requestApi = makeRequestApi(respondWith(200, { ...INVITE, code: 'lower!' }))
    await expect(
      requestApi({ method: 'GET', url: '/couples/invites', schema: createInviteResponseSchema }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INVALID_RESPONSE',
    })
  })

  it('네트워크 에러는 status 없는 ApiError(NETWORK)로 바꾼다', async () => {
    const requestApi = makeRequestApi(failNetwork)
    const promise = requestApi({ method: 'GET', url: '/couples/invites', schema: createInviteResponseSchema })
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({ code: 'NETWORK', status: null })
  })

  it('서버 에러는 status·message·issues를 담은 ApiError(HTTP)로 바꾼다', async () => {
    const body = {
      statusCode: 400,
      message: '입력값을 확인해 주세요',
      issues: [{ path: 'name', message: 'Too small' }],
      requestId: 'req-1',
    }
    const requestApi = makeRequestApi(respondWith(400, body))
    await expect(
      requestApi({ method: 'POST', url: '/couples/invites', data: {}, schema: createInviteResponseSchema }),
    ).rejects.toMatchObject({
      code: 'HTTP',
      status: 400,
      message: '입력값을 확인해 주세요',
      issues: body.issues,
      requestId: 'req-1',
    })
  })

  it('headers를 넘기면 그대로 보낸다 (로그아웃 정리: 지우기 전에 읽어 둔 토큰으로 인증)', async () => {
    const seen: string[] = []
    const capture: AxiosAdapter = async (config) => {
      seen.push(String(config.headers.get('Authorization')))
      return { data: '', status: 204, statusText: '', headers: {}, config }
    }
    await makeRequestApi(capture)({
      method: 'DELETE',
      url: '/me/push-tokens/t',
      headers: { Authorization: 'Bearer old' },
    })
    expect(seen).toEqual(['Bearer old'])
  })

  it('스키마 없이 호출하면 응답 본문 없이 끝난다(204 등)', async () => {
    const requestApi = makeRequestApi(respondWith(204, ''))
    await expect(requestApi({ method: 'DELETE', url: '/couples/invites' })).resolves.toBeUndefined()
  })

  it.each([
    [409, 'COUPLE_UNLINKING'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMITED'],
    [500, 'UNKNOWN'],
  ] as const)('HTTP %s 는 ApiError.kind = %s', async (status, kind) => {
    const requestApi = makeRequestApi(respondWith(status, { statusCode: status, message: 'x' }))
    await expect(requestApi({ method: 'POST', url: '/couples/invites' })).rejects.toMatchObject({ status, kind })
  })

  it('네트워크 에러의 kind는 UNKNOWN', async () => {
    await expect(makeRequestApi(failNetwork)({ method: 'GET', url: '/me' })).rejects.toMatchObject({ kind: 'UNKNOWN' })
  })
})
