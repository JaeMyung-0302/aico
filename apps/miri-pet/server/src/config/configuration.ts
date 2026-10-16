import { parseTrustProxyHops } from '../common/throttle/client-ip'

// 환경변수를 한 곳에서 읽는다. 비밀값은 .env(커밋 금지)로만 주입한다
export const configuration = () => ({
  port: Number(process.env.PORT ?? 4008),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Express trust proxy 홉 수. 로컬 0, 운영(Cloudflare → Lightsail → Docker) 2
  trustProxyHops: parseTrustProxyHops(process.env.TRUST_PROXY_HOPS),
  jwtSecret: process.env.JWT_SECRET ?? '',
  // 기기 GPS "내 위치" 원격 플래그. 위치기반서비스 신고 확인 전까지 false (D4)
  isGpsEnabled: process.env.ENABLE_GPS_LOCATION === 'true',
  isDevLoginEnabled: process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_LOGIN === 'true',
  kakao: {
    nativeAppKey: process.env.KAKAO_NATIVE_APP_KEY ?? '',
    // 탈퇴 시 카카오 unlink용 Admin 키(런타임 전용). TODO: 루트 turbo.json env 목록에 추가 후 아래 disable 제거
    adminKey: process.env.KAKAO_ADMIN_KEY ?? '',
  },
  google: {
    clientIds: [
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter((id): id is string => typeof id === 'string' && id.length > 0),
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    publicBucket: process.env.R2_PUBLIC_BUCKET ?? 'miripet-public',
    privateBucket: process.env.R2_PRIVATE_BUCKET ?? 'miripet-private',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
    // 로컬 개발용 S3 호환 저장소(MinIO) 주소. 비우면 Cloudflare R2 계정 엔드포인트를 쓴다
    endpoint: process.env.R2_ENDPOINT ?? '',
  },
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  posthog: { apiKey: process.env.POSTHOG_API_KEY ?? '', host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com' },
  sentryDsn: process.env.SENTRY_DSN ?? '',
})

export type AppConfig = ReturnType<typeof configuration>
