import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextFunction, Request } from 'express'
import { LEGAL_DIR, LEGAL_DOCS, legalPagesMiddleware, matchLegalDoc } from './legal-pages'

describe('legal pages', () => {
  it.each([
    ['/legal/terms', 'terms'],
    ['/legal/privacy.html', 'privacy'],
    ['/legal/location', 'location'],
  ])('%s → %s', (path, doc) => {
    expect(matchLegalDoc(path)).toBe(doc)
  })

  it.each(['/legal/../.env', '/legal/unknown', '/api/v1/legal/terms', '/legal/terms/x'])(
    '%s는 매칭하지 않는다',
    (path) => {
      expect(matchLegalDoc(path)).toBeNull()
    },
  )

  it.each(LEGAL_DOCS)('%s.html 초안이 존재하고 초안 표기가 있다', (doc) => {
    const file = join(LEGAL_DIR, `${doc}.html`)
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(file, 'utf8')).toContain('초안')
  })

  it('처리방침에 국외 이전 고지(R2·Expo·PostHog·Sentry)가 있다', () => {
    const html = readFileSync(join(LEGAL_DIR, 'privacy.html'), 'utf8')
    expect(html).toContain('국외 이전')
    ;['Cloudflare', 'Expo', 'PostHog', 'Sentry'].forEach((vendor) => expect(html).toContain(vendor))
  })
})

describe('legalPagesMiddleware', () => {
  const run = (method: string, path: string) => {
    const res = { type: jest.fn(), sendFile: jest.fn() }
    res.type.mockReturnValue(res)
    const next: jest.MockedFunction<NextFunction> = jest.fn()
    const req: Pick<Request, 'method' | 'path'> = { method, path }
    legalPagesMiddleware(req, res, next)
    return { res, next }
  }

  it('GET /legal/privacy는 HTML 파일을 보낸다', () => {
    const { res, next } = run('GET', '/legal/privacy')
    expect(res.type).toHaveBeenCalledWith('html')
    expect(res.sendFile).toHaveBeenCalledWith(join(LEGAL_DIR, 'privacy.html'))
    expect(next).not.toHaveBeenCalled()
  })

  it('다른 경로·메서드는 next로 넘긴다', () => {
    expect(run('POST', '/legal/privacy').next).toHaveBeenCalled()
    expect(run('GET', '/api/v1/health').next).toHaveBeenCalled()
  })
})
