import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { resolveTestDatabaseUrl } from './test-database-url'

// 테스트 DB에 최신 마이그레이션을 적용한다
const globalSetup = async () => {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: resolveTestDatabaseUrl() },
    stdio: 'pipe',
  })
}

export default globalSetup
