import { parseTrustProxyHops } from '../common/throttle/client-ip'

// 환경변수를 한 곳에서 읽는다. 비밀값은 .env(커밋 금지)로만 주입한다
export const configuration = () => ({
  port: Number(process.env.PORT ?? 4009),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Express trust proxy 홉 수. 로컬 0, 운영(Cloudflare → Lightsail → Docker) 2
  trustProxyHops: parseTrustProxyHops(process.env.TRUST_PROXY_HOPS),
  jwtSecret: process.env.JWT_SECRET ?? '',
  isDevLoginEnabled: process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_LOGIN === 'true',
  // 연결 해제 30일 뒤 삭제(purge) 실행 여부. 운영에서 검증 전까지 false
  purgeEnabled: process.env.PURGE_ENABLED === 'true',
  kakao: {
    // id_token aud 검증용 네이티브 앱 키
    nativeAppKey: process.env.KAKAO_NATIVE_APP_KEY ?? '',
    // 카카오 로컬 API(장소 검색·좌표→주소) 서버 프록시용 REST 키(서버 전용)
    restApiKey: process.env.KAKAO_REST_API_KEY ?? '',
    // 탈퇴 시 카카오 unlink용 Admin 키(서버 전용)
    adminKey: process.env.KAKAO_ADMIN_KEY ?? '',
  },
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  // Cloudflare R2 private 버킷 하나(접두사 c/ · incoming/ · exports/ · system/purge-ledger/)
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    privateBucket: process.env.R2_PRIVATE_BUCKET || 'youinheart-private',
    // 로컬 개발 전용(SeaweedFS). 비우면 R2 계정 엔드포인트
    endpoint: process.env.R2_ENDPOINT ?? '',
  },
})

export type AppConfig = ReturnType<typeof configuration>
