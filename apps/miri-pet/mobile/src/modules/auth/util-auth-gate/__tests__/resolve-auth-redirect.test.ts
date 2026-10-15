import { resolveAuthRedirect, type AuthGateInput } from '../resolve-auth-redirect'

const input = (overrides: Partial<AuthGateInput>): AuthGateInput => ({
  sessionStatus: 'signedIn',
  consentStatus: 'done',
  petStatus: 'some',
  currentSegment: '(tabs)',
  ...overrides,
})

describe('resolveAuthRedirect', () => {
  it('세션 확인 중이면 아무 데도 보내지 않는다(스플래시 유지)', () => {
    expect(resolveAuthRedirect(input({ sessionStatus: 'loading', consentStatus: 'unknown' }))).toBeNull()
  })

  it.each(['(tabs)', 'settings', 'consent', 'users', undefined])(
    '토큰이 없으면 %s 에서 /login으로 보낸다',
    (segment) => {
      expect(
        resolveAuthRedirect(input({ sessionStatus: 'signedOut', consentStatus: 'unknown', currentSegment: segment })),
      ).toBe('/login')
    },
  )

  it('토큰이 없고 이미 /login이면 그대로 둔다', () => {
    expect(
      resolveAuthRedirect(input({ sessionStatus: 'signedOut', consentStatus: 'unknown', currentSegment: 'login' })),
    ).toBeNull()
  })

  it('로그인했지만 동의 여부를 아직 모르면 기다린다', () => {
    expect(resolveAuthRedirect(input({ consentStatus: 'unknown', currentSegment: 'login' }))).toBeNull()
  })

  it.each(['login', '(tabs)', 'settings'])('동의가 필요하면 %s 에서 /consent로 보낸다', (segment) => {
    expect(resolveAuthRedirect(input({ consentStatus: 'required', currentSegment: segment }))).toBe('/consent')
  })

  it('동의가 필요하고 이미 /consent이면 그대로 둔다', () => {
    expect(resolveAuthRedirect(input({ consentStatus: 'required', currentSegment: 'consent' }))).toBeNull()
  })

  it.each(['login', 'consent'])('동의까지 끝났는데 %s 에 있으면 탭(/)으로 보낸다', (segment) => {
    expect(resolveAuthRedirect(input({ currentSegment: segment }))).toBe('/')
  })

  it.each(['(tabs)', 'settings', 'users', 'onboarding'])('동의까지 끝났고 %s 에 있으면 그대로 둔다', (segment) => {
    expect(resolveAuthRedirect(input({ currentSegment: segment }))).toBeNull()
  })

  describe('PHASE 2: 펫 0마리 → 03 펫 만들기', () => {
    it.each(['login', 'consent', '(tabs)', 'pets', 'users'])('펫이 없으면 %s 에서 /onboarding/pet으로 보낸다', (segment) => {
      expect(resolveAuthRedirect(input({ petStatus: 'none', currentSegment: segment }))).toBe('/onboarding/pet')
    })

    it.each(['onboarding', 'settings'])('펫이 없어도 %s 에서는 그대로 둔다 (설정에서 로그아웃·탈퇴는 가능)', (segment) => {
      expect(resolveAuthRedirect(input({ petStatus: 'none', currentSegment: segment }))).toBeNull()
    })

    it.each(['login', 'consent', '(tabs)'])('펫 수를 아직 모르면 %s 에서 기다린다', (segment) => {
      expect(resolveAuthRedirect(input({ petStatus: 'unknown', currentSegment: segment }))).toBeNull()
    })

    it('동의 전에는 펫 여부와 상관없이 /consent가 먼저다', () => {
      expect(
        resolveAuthRedirect(input({ consentStatus: 'required', petStatus: 'none', currentSegment: '(tabs)' })),
      ).toBe('/consent')
    })

    it('펫이 있으면 onboarding에 있어도 그대로 둔다 (만든 직후 접종 추가로 이동하는 중)', () => {
      expect(resolveAuthRedirect(input({ petStatus: 'some', currentSegment: 'onboarding' }))).toBeNull()
    })
  })
})
