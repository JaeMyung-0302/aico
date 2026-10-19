import { type AccessInput, resolveAccessLevel } from '../resolve-access-level'

const input = (overrides: Partial<AccessInput>): AccessInput => ({
  sessionStatus: 'signedIn',
  consentStatus: 'done',
  petStatus: 'some',
  ...overrides,
})

describe('resolveAccessLevel', () => {
  it('세션 확인 중이면 아직 정할 수 없다(null → 스플래시 유지)', () => {
    expect(resolveAccessLevel(input({ sessionStatus: 'loading', consentStatus: 'unknown' }))).toBeNull()
  })

  it('토큰이 없으면 signedOut (동의·펫 상태와 무관)', () => {
    expect(resolveAccessLevel(input({ sessionStatus: 'signedOut', consentStatus: 'unknown' }))).toBe('signedOut')
    expect(resolveAccessLevel(input({ sessionStatus: 'signedOut' }))).toBe('signedOut')
  })

  it('로그인했지만 /me를 아직 모르면 null', () => {
    expect(resolveAccessLevel(input({ consentStatus: 'unknown', petStatus: 'unknown' }))).toBeNull()
  })

  it('필수 동의가 없으면 consentRequired', () => {
    expect(resolveAccessLevel(input({ consentStatus: 'required', petStatus: 'unknown' }))).toBe('consentRequired')
  })

  it('동의는 했지만 펫 목록을 아직 모르면 null', () => {
    expect(resolveAccessLevel(input({ petStatus: 'unknown' }))).toBeNull()
  })

  it('동의했고 펫이 0마리면 petless', () => {
    expect(resolveAccessLevel(input({ petStatus: 'none' }))).toBe('petless')
  })

  it('동의했고 펫이 있으면(또는 조회 실패 = some) allowed', () => {
    expect(resolveAccessLevel(input({ petStatus: 'some' }))).toBe('allowed')
  })
})
