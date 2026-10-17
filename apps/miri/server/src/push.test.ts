import { describe, expect, it, vi } from 'vitest'
import { sendPush } from './push.ts'

// 테스트 전용 키쌍. 운영 키는 wrangler secret 으로만 주입한다.
const PUBLIC_KEY =
  'BLC5_xKRGXDM_CLEdw6ksHMg4phBN1lRRfajDR-8gcGSLkmSs_1j6oU_OqDapW-NwHij7t-m5BLSgd1ePT3yYa4'
const PRIVATE_KEY = 'fMqJPuM1_bjvyONAL0MRZq0Io37FX5zEVoVe1XhxoVA'

const vapid = { subject: 'mailto:test@example.com', publicKey: PUBLIC_KEY, privateKey: PRIVATE_KEY }
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  p256dh: 'x',
  auth: 'y',
}

function stubFetch(status: number) {
  const calls: RequestInit[] = []
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    calls.push(init)
    return { ok: status >= 200 && status < 300, status } as Response
  })
  return calls
}

async function verifySignature(jwt: string): Promise<boolean> {
  const [header, claims, signature] = jwt.split('.')
  const point = Buffer.from(PUBLIC_KEY, 'base64url')
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: point.subarray(1, 33).toString('base64url'),
      y: point.subarray(33, 65).toString('base64url'),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    Buffer.from(signature!, 'base64url'),
    Buffer.from(`${header}.${claims}`),
  )
}

describe('sendPush', () => {
  it('signs a verifiable ES256 VAPID token scoped to the endpoint origin', async () => {
    const calls = stubFetch(201)
    const result = await sendPush(subscription, vapid)

    expect(result).toEqual({ ok: true })

    const headers = calls[0]!.headers as Record<string, string>
    const jwt = headers.Authorization!.match(/t=([^,]+)/)![1]!
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString())

    expect(claims.aud).toBe('https://fcm.googleapis.com')
    expect(claims.sub).toBe(vapid.subject)
    expect(Buffer.from(jwt.split('.')[2]!, 'base64url')).toHaveLength(64)
    await expect(verifySignature(jwt)).resolves.toBe(true)
  })

  it('sends no body so that payload encryption is never required', async () => {
    const calls = stubFetch(201)
    await sendPush(subscription, vapid)

    expect(calls[0]!.body).toBeUndefined()
    expect((calls[0]!.headers as Record<string, string>).TTL).toBe('86400')
  })

  it.each([404, 410])('marks the subscription gone on %i', async (status) => {
    stubFetch(status)
    await expect(sendPush(subscription, vapid)).resolves.toEqual({ ok: false, status, gone: true })
  })

  it('reports a transient failure without marking the subscription gone', async () => {
    stubFetch(429)
    await expect(sendPush(subscription, vapid)).resolves.toEqual({
      ok: false,
      status: 429,
      gone: false,
    })
  })

  it('rejects a public key that is not an uncompressed P-256 point', async () => {
    stubFetch(201)
    await expect(sendPush(subscription, { ...vapid, publicKey: 'AAAA' })).rejects.toThrow(
      '65-byte uncompressed P-256 point',
    )
  })
})
