import { configuration } from './configuration'

// 테스트마다 env를 바꾸고 되돌린다
const withEnv = (values: Record<string, string | undefined>, run: () => void): void => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  const apply = (next: Record<string, string | undefined>) =>
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  apply(values)
  try {
    run()
  } finally {
    apply(previous)
  }
}

describe('configuration: PURGE_ENABLED', () => {
  it('기본값 false', () => {
    withEnv({ PURGE_ENABLED: undefined }, () => expect(configuration().purgeEnabled).toBe(false))
  })

  it("'true'일 때만 true", () => {
    withEnv({ PURGE_ENABLED: 'true' }, () => expect(configuration().purgeEnabled).toBe(true))
    withEnv({ PURGE_ENABLED: '1' }, () => expect(configuration().purgeEnabled).toBe(false))
  })
})

describe('configuration: ENABLE_DEV_LOGIN', () => {
  it("NODE_ENV가 production이 아니고 'true'일 때만 켜진다", () => {
    withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' }, () => expect(configuration().isDevLoginEnabled).toBe(true))
    withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'production' }, () =>
      expect(configuration().isDevLoginEnabled).toBe(false),
    )
    withEnv({ ENABLE_DEV_LOGIN: undefined, NODE_ENV: 'test' }, () =>
      expect(configuration().isDevLoginEnabled).toBe(false),
    )
  })
})

describe('configuration: 기본값', () => {
  it('포트 기본값은 4009', () => {
    withEnv({ PORT: undefined }, () => expect(configuration().port).toBe(4009))
  })
})
