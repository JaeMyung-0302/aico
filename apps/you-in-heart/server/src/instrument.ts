import { initSentry } from './observability/sentry'

// main.ts의 첫 import여야 한다 — Sentry가 http·express 계측을 Nest보다 먼저 건다
// .env 파일은 아직 로드 전이라 process.env(컨테이너 env_file)에 있는 SENTRY_DSN만 본다
initSentry(process.env)
