// 각 통합 테스트 워커에서 앱보다 먼저 실행된다: Prisma가 테스트 DB를 보도록 DATABASE_URL을 바꾼다
import { resolveTestDatabaseUrl } from './test-database-url'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = resolveTestDatabaseUrl()
// 부팅 검증(32바이트 이상)을 통과하는 테스트 전용 값
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-only-secret-32-bytes-min'
// 테스트가 앱을 띄워도 purge cron이 실제로 지우지 않는다
process.env.PURGE_ENABLED = 'false'
