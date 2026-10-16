import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ENV_PATH = resolve(__dirname, '../../.env')

const readEnvFileValue = (key: string): string | undefined => {
  if (!existsSync(ENV_PATH)) return undefined
  const line = readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${key}=`))
  return line?.slice(key.length + 1).replace(/^"|"$/g, '')
}

// DATABASE_URL_TEST(환경변수 우선, 없으면 .env)를 쓴다. 병렬 worktree는 miripet_test_p{N}을 가리키게 바꾼다(A5)
export const resolveTestDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL_TEST ?? readEnvFileValue('DATABASE_URL_TEST')
  if (!url) {
    throw new Error('DATABASE_URL_TEST가 없습니다. apps/miri-pet/server/.env.example을 참고하세요')
  }
  if (!/\/miripet_test(_p\d+)?\?/.test(url)) {
    throw new Error(`테스트 DB(miripet_test*)가 아닌 곳에는 통합 테스트를 돌리지 않습니다: ${url}`)
  }
  return url
}
