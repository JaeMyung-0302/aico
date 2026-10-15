const CF_CONNECTING_IP = 'cf-connecting-ip'
const UNKNOWN_CLIENT = 'unknown'

// throttler는 req를 Record<string, any>로 넘기므로 필드를 unknown으로 받아 런타임에 좁힌다
export type ClientIpSource = { ip?: unknown; headers?: unknown }

const readHeader = (headers: unknown, name: string): string => {
  if (typeof headers !== 'object' || headers === null) return ''
  const value: unknown = Reflect.get(headers, name)
  const first: unknown = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first.trim() : ''
}

// rate limit 키로 쓸 클라이언트 IP.
// 프록시 뒤(trust proxy > 0)에서는 Cloudflare가 넣는 cf-connecting-ip를 우선한다.
// 프록시 없이(0) 직접 받는 요청의 헤더는 위조 가능하므로 무시하고 소켓 기준 req.ip를 쓴다
export const resolveClientIp = (req: ClientIpSource, trustProxyHops: number): string => {
  const cfIp = trustProxyHops > 0 ? readHeader(req.headers, CF_CONNECTING_IP) : ''
  if (cfIp) return cfIp
  return typeof req.ip === 'string' && req.ip.length > 0 ? req.ip : UNKNOWN_CLIENT
}

// TRUST_PROXY_HOPS: 0(로컬 기본) | 2(Cloudflare → Lightsail → Docker). 잘못된 값은 0(아무 프록시도 신뢰 안 함)
export const parseTrustProxyHops = (raw: string | undefined): number => {
  const hops = Number(raw ?? 0)
  return Number.isInteger(hops) && hops >= 0 ? hops : 0
}
