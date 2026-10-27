import { type AuthGateInput, isUnlinkingBannerVisible, resolveAuthRedirect } from '../resolve-auth-redirect'

const ACTIVE = { status: 'ACTIVE' as const }
const UNLINKING = { status: 'UNLINKING' as const }

const input = (overrides: Partial<AuthGateInput>): AuthGateInput => ({
  sessionStatus: 'signedIn',
  me: { displayName: '재명', couple: ACTIVE },
  isMeError: false,
  ...overrides,
})

// plan 0F.5 상태별 라우팅 표
describe('resolveAuthRedirect', () => {
  it.each<[string, Partial<AuthGateInput>, ReturnType<typeof resolveAuthRedirect>]>([
    ['세션 확인 중 → 판단 보류(스플래시)', { sessionStatus: 'loading', me: undefined }, null],
    ['signedOut → /login', { sessionStatus: 'signedOut', me: undefined }, '/login'],
    ['signedOut 은 캐시된 /me 와 무관하게 /login', { sessionStatus: 'signedOut' }, '/login'],
    ['로그인 + /me 조회 중 → 판단 보류', { me: undefined }, null],
    ['displayName 없음 → /onboarding/profile', { me: { displayName: null, couple: null } }, '/onboarding/profile'],
    ['displayName 빈 문자열도 없음으로 본다', { me: { displayName: '', couple: null } }, '/onboarding/profile'],
    ['이름은 있고 미연결 → /pairing', { me: { displayName: '재명', couple: null } }, '/pairing'],
    [
      '필수 동의(약관·개인정보)가 빠지면 이름이 있어도 → /onboarding/profile(동의 후 저장)',
      { me: { displayName: '재명', couple: ACTIVE, consents: { terms: true, privacy: false } } },
      '/onboarding/profile',
    ],
    ['UNLINKING → /(tabs)', { me: { displayName: '재명', couple: UNLINKING } }, '/(tabs)'],
    ['ACTIVE → /(tabs)', {}, '/(tabs)'],
    [
      '/me 조회 실패(오프라인 콜드 스타트) → 스플래시에 갇히지 않게 /(tabs)',
      { me: undefined, isMeError: true },
      '/(tabs)',
    ],
  ])('%s', (_, overrides, expected) => {
    expect(resolveAuthRedirect(input(overrides))).toBe(expected)
  })

  it('이름이 없으면 커플 상태보다 프로필 입력이 먼저다', () => {
    expect(resolveAuthRedirect(input({ me: { displayName: null, couple: ACTIVE } }))).toBe('/onboarding/profile')
  })

  it('/me 캐시가 있으면 조회 실패여도 캐시 기준으로 판단한다', () => {
    expect(resolveAuthRedirect(input({ me: { displayName: '재명', couple: null }, isMeError: true }))).toBe('/pairing')
  })
})

describe('isUnlinkingBannerVisible', () => {
  it('UNLINKING 일 때만 배너를 보인다', () => {
    expect(isUnlinkingBannerVisible({ displayName: '재명', couple: UNLINKING })).toBe(true)
    expect(isUnlinkingBannerVisible({ displayName: '재명', couple: ACTIVE })).toBe(false)
    expect(isUnlinkingBannerVisible({ displayName: '재명', couple: null })).toBe(false)
    expect(isUnlinkingBannerVisible(undefined)).toBe(false)
  })
})
