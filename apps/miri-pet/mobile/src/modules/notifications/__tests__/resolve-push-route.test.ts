import { isAuthGateOpen, resolvePushRoute, shouldShowInForeground } from '../util-push-route/resolve-push-route'

const CONVERSATION_ID = '01890a5d-ac96-774b-bcce-b302099a8001'
const POST_ID = '01890a5d-ac96-774b-bcce-b302099a8002'
const USER_ID = '01890a5d-ac96-774b-bcce-b302099a8003'
const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8004'

describe('resolvePushRoute', () => {
  it('DM → 대화방', () => {
    expect(resolvePushRoute({ kind: 'DM', conversationId: CONVERSATION_ID })).toEqual({
      pathname: '/dm/[conversationId]',
      params: { conversationId: CONVERSATION_ID },
    })
  })

  it.each(['LIKE', 'COMMENT'])('%s → 게시물 상세', (kind) => {
    expect(resolvePushRoute({ kind, postId: POST_ID })).toEqual({
      pathname: '/posts/[postId]',
      params: { postId: POST_ID },
    })
  })

  it('FOLLOW → 팔로우한 사람 프로필', () => {
    expect(resolvePushRoute({ kind: 'FOLLOW', userId: USER_ID })).toEqual({
      pathname: '/users/[userId]',
      params: { userId: USER_ID },
    })
  })

  it('VACCINATION_DUE + petId → 그 펫의 입장용 카드', () => {
    expect(resolvePushRoute({ kind: 'VACCINATION_DUE', petId: PET_ID, vaccinationId: POST_ID })).toEqual({
      pathname: '/pets/[petId]/entry-card',
      params: { petId: PET_ID },
    })
  })

  it.each([{}, { petId: 'not-a-uuid' }])('VACCINATION_DUE인데 petId가 없거나 잘못되면 내 펫 탭 (%j)', (extra) => {
    expect(resolvePushRoute({ kind: 'VACCINATION_DUE', ...extra })).toBe('/(tabs)/pets')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['문자열', 'DM'],
    ['배열', [{ kind: 'DM', conversationId: CONVERSATION_ID }]],
    ['빈 객체', {}],
    ['알 수 없는 kind', { kind: 'PLACE_REPORT_REVIEWED', refId: POST_ID }],
    ['DM_REQUEST(푸시 없음)', { kind: 'DM_REQUEST', postId: POST_ID }],
    ['DM id 없음', { kind: 'DM' }],
    ['LIKE 빈 postId(서버 폴백)', { kind: 'LIKE', postId: '' }],
    ['COMMENT id가 숫자', { kind: 'COMMENT', postId: 42 }],
    ['FOLLOW id가 경로 조작 문자열', { kind: 'FOLLOW', userId: '../settings' }],
  ])('잘못된 data(%s)면 null', (_label, data) => {
    expect(resolvePushRoute(data)).toBeNull()
  })
})

describe('shouldShowInForeground', () => {
  const dm = { kind: 'DM', conversationId: CONVERSATION_ID }

  it('그 대화방을 보고 있으면 DM 배너를 띄우지 않는다', () => {
    expect(shouldShowInForeground(dm, `/dm/${CONVERSATION_ID}`)).toBe(false)
  })

  it('다른 화면·다른 대화방이면 DM 배너를 띄운다', () => {
    expect(shouldShowInForeground(dm, '/dm')).toBe(true)
    expect(shouldShowInForeground(dm, `/dm/${POST_ID}`)).toBe(true)
  })

  it('DM이 아닌 알림·알 수 없는 data는 항상 띄운다', () => {
    expect(shouldShowInForeground({ kind: 'LIKE', postId: POST_ID }, `/posts/${POST_ID}`)).toBe(true)
    expect(shouldShowInForeground(null, '/')).toBe(true)
  })
})

describe('isAuthGateOpen', () => {
  const open = {
    sessionStatus: 'signedIn' as const,
    consentStatus: 'done' as const,
    petStatus: 'some' as const,
    currentSegment: '(tabs)',
  }

  it('로그인 + 동의 완료 + 펫 있음 + 이동할 리다이렉트 없음 → 열림', () => {
    expect(isAuthGateOpen(open)).toBe(true)
    expect(isAuthGateOpen({ ...open, currentSegment: 'settings' })).toBe(true)
  })

  it.each([
    ['세션 확인 중', { sessionStatus: 'loading' as const }],
    ['로그아웃', { sessionStatus: 'signedOut' as const }],
    ['동의 확인 중', { consentStatus: 'unknown' as const }],
    ['동의 필요', { consentStatus: 'required' as const }],
    ['펫 조회 중', { petStatus: 'unknown' as const }],
    ['펫 없음', { petStatus: 'none' as const }],
    ['아직 로그인 화면(탭으로 이동 대기)', { currentSegment: 'login' }],
    ['아직 동의 화면(탭으로 이동 대기)', { currentSegment: 'consent' }],
  ])('%s → 닫힘', (_label, patch) => {
    expect(isAuthGateOpen({ ...open, ...patch })).toBe(false)
  })
})
