import { BadRequestException } from '@nestjs/common'
import { RejectNulPipe } from './reject-nul.pipe'

const captureError = (fn: () => unknown): unknown => {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('예외가 발생하지 않았습니다')
}

// QA1 P2: Postgres는 text에 NUL(\u0000)을 못 넣는다 → 500 대신 400
describe('RejectNulPipe', () => {
  const pipe = new RejectNulPipe()

  it('NUL이 없으면 값을 그대로 돌려준다', () => {
    const value = { body: '안녕', tags: ['a'], nested: { n: 1, flag: true, none: null } }
    expect(pipe.transform(value, { type: 'body' })).toBe(value)
  })

  it.each([
    ['body 문자열', { body: 'a\u0000b' }, 'body', 'body'],
    ['중첩 객체', { pet: { name: '보\u0000리' } }, 'body', 'pet.name'],
    ['배열 원소', { ids: ['ok', '\u0000'] }, 'body', 'ids.1'],
    ['query 객체', { nickname: 'a\u0000' }, 'query', 'nickname'],
  ] as const)('%s에 NUL이 있으면 400 Validation failed', (_label, value, type, path) => {
    const error = captureError(() => pipe.transform(value, { type }))
    expect(error).toBeInstanceOf(BadRequestException)
    const response = error instanceof BadRequestException ? error.getResponse() : null
    expect(response).toMatchObject({ statusCode: 400, message: 'Validation failed', in: type, issues: [{ path }] })
  })

  it('단일 문자열 param에 NUL이 있으면 400', () => {
    expect(captureError(() => pipe.transform('x\u0000', { type: 'param', data: 'id' }))).toBeInstanceOf(
      BadRequestException,
    )
  })

  it('custom 데코레이터 값(인증 사용자 등)은 검사하지 않는다', () => {
    const value = { id: '\u0000' }
    expect(pipe.transform(value, { type: 'custom' })).toBe(value)
  })
})
