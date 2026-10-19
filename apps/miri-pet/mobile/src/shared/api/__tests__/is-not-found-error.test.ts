import { ApiError } from '../api-error'
import { isNotFoundError } from '../is-not-found-error'

describe('isNotFoundError', () => {
  it('404·403(삭제됐거나 볼 수 없음)은 "없음"으로 본다', () => {
    expect(isNotFoundError(new ApiError({ code: 'HTTP', status: 404, message: '없음' }))).toBe(true)
    expect(isNotFoundError(new ApiError({ code: 'HTTP', status: 403, message: '권한 없음' }))).toBe(true)
  })

  it('네트워크·서버 오류·알 수 없는 값은 "없음"이 아니다(다시 시도 대상)', () => {
    expect(isNotFoundError(new ApiError({ code: 'NETWORK', message: '네트워크' }))).toBe(false)
    expect(isNotFoundError(new ApiError({ code: 'HTTP', status: 500, message: '서버' }))).toBe(false)
    expect(isNotFoundError(new Error('x'))).toBe(false)
    expect(isNotFoundError(null)).toBe(false)
  })
})
