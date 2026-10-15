import type { ConsentKind, MyConsent } from '@miri-pet/shared'

// required: 철회 = 회원 탈퇴(토글 없음), optional: 설정에서 켜고 끔, certificate: 읽기 전용 + 기존 철회 흐름
export type ConsentGroup = 'required' | 'optional' | 'certificate'

export type ConsentRow = {
  kind: ConsentKind
  label: string
  group: ConsentGroup
  isAgreed: boolean
  status: string
}

const ROW_SPECS: readonly { kind: ConsentKind; label: string; group: ConsentGroup }[] = [
  { kind: 'TERMS', label: '서비스 이용약관', group: 'required' },
  { kind: 'PRIVACY', label: '개인정보 수집 · 이용', group: 'required' },
  { kind: 'LOCATION', label: '위치기반서비스 이용', group: 'optional' },
  { kind: 'MARKETING', label: '마케팅 정보 수신', group: 'optional' },
  { kind: 'CERTIFICATE', label: '증명서 사진 보관', group: 'certificate' },
]

const pad = (value: number) => String(value).padStart(2, '0')

export const formatConsentDate = (iso: string): string => {
  const date = new Date(iso)
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

// 철회되지 않은 동의가 있는지 (GET /me/consents는 kind별 최신 행만 준다)
export const isConsentAgreed = (consents: readonly MyConsent[] | undefined, kind: ConsentKind): boolean =>
  consents?.some((consent) => consent.kind === kind && consent.withdrawnAt === null) ?? false

const statusOf = (consent: MyConsent | undefined): string => {
  if (!consent) return '동의하지 않음'
  if (consent.withdrawnAt) return `${formatConsentDate(consent.withdrawnAt)} 철회`
  return `${formatConsentDate(consent.agreedAt)} 동의`
}

export const buildConsentRows = (consents: readonly MyConsent[]): ConsentRow[] =>
  ROW_SPECS.map((spec) => {
    const consent = consents.find((candidate) => candidate.kind === spec.kind)
    return { ...spec, isAgreed: isConsentAgreed(consents, spec.kind), status: statusOf(consent) }
  })
