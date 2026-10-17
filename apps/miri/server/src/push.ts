/**
 * VAPID(RFC 8292) 웹푸시 발송.
 *
 * v1은 payload 없이 보낸다. 알림 문구가 항상 같아서 본문을 실을 이유가 없고,
 * aes128gcm 암호화(RFC 8291)를 통째로 건너뛸 수 있어 Worker CPU 예산에 여유가 생긴다.
 * 본문이 필요해지는 시점에 암호화를 얹는다.
 */

export type PushSubscription = {
  endpoint: string
  p256dh: string
  auth: string
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** VAPID 공개키(비압축 P-256 점)와 개인키 d 값으로 서명용 CryptoKey를 만든다. */
async function importSigningKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const point = fromBase64Url(publicKey)
  if (point.length !== 65 || point[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 point')
  }

  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(point.slice(1, 33)),
      y: toBase64Url(point.slice(33, 65)),
      d: privateKey,
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

/** 푸시 서비스 엔드포인트의 origin을 aud로 하는 ES256 JWT를 만든다. */
async function createVapidToken(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Promise<string> {
  const header = toBase64Url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = toBase64Url(
    encoder.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      }),
    ),
  )

  const signingInput = `${header}.${claims}`
  const key = await importSigningKey(publicKey, privateKey)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(signingInput),
  )

  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`
}

export type PushResult = { ok: true } | { ok: false; status: number; gone: boolean }

/**
 * 구독 1건에 푸시를 보낸다.
 * gone=true 는 구독이 만료·해지됐다는 뜻이라 호출부에서 삭제해야 한다.
 */
export async function sendPush(
  subscription: PushSubscription,
  vapid: { subject: string; publicKey: string; privateKey: string },
): Promise<PushResult> {
  const token = await createVapidToken(
    subscription.endpoint,
    vapid.subject,
    vapid.publicKey,
    vapid.privateKey,
  )

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${vapid.publicKey}`,
      TTL: '86400',
      Urgency: 'normal',
      'Content-Length': '0',
    },
  })

  if (response.ok) return { ok: true }
  return { ok: false, status: response.status, gone: response.status === 404 || response.status === 410 }
}
