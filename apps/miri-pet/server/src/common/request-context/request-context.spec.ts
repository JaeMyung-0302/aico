import { getRequestContext, requestContextMiddleware, runWithRequestContext } from './request-context'

describe('request-context', () => {
  it('컨텍스트 밖에서는 undefined', () => {
    expect(getRequestContext()).toBeUndefined()
  })

  it('runWithRequestContext 안에서는 요청마다 새 memo를 쓴다', async () => {
    const first = await runWithRequestContext(async () => getRequestContext())
    const second = await runWithRequestContext(async () => getRequestContext())
    expect(first?.hiddenUserIds).toBeInstanceOf(Map)
    expect(first).not.toBe(second)
  })

  it('미들웨어는 next를 컨텍스트 안에서 호출한다', () => {
    let seen: unknown
    requestContextMiddleware({}, {}, () => {
      seen = getRequestContext()
    })
    expect(seen).toBeDefined()
  })
})
