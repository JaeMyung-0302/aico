import {
  CURRENT_CONSENT_VERSION,
  REQUIRED_CONSENT_KINDS,
  type ConsentKind,
  type SubmitConsentsRequest,
} from '@miri-pet/shared'

export type ConsentFormValues = {
  isAge14OrOlder: boolean
  terms: boolean
  privacy: boolean
  community: boolean
  location: boolean
  marketing: boolean
}

export type ConsentItemKey = keyof ConsentFormValues

// 서버에 kind로 기록되는 항목. community(커뮤니티 수칙)는 kind가 없어 이용약관(TERMS) 동의에 포함한다
const CONSENT_KIND_BY_ITEM: Partial<Record<ConsentItemKey, ConsentKind>> = {
  terms: 'TERMS',
  privacy: 'PRIVACY',
  location: 'LOCATION',
  marketing: 'MARKETING',
}

const ALWAYS_REQUIRED: readonly ConsentItemKey[] = ['isAge14OrOlder', 'community']
const REQUIRED_KINDS: readonly ConsentKind[] = REQUIRED_CONSENT_KINDS

// 필수 여부는 서버와 같은 shared REQUIRED_CONSENT_KINDS에서 가져온다 (어긋나면 서버가 422로 거절한다)
export const isConsentItemRequired = (key: ConsentItemKey): boolean => {
  if (ALWAYS_REQUIRED.includes(key)) return true
  const kind = CONSENT_KIND_BY_ITEM[key]
  return kind !== undefined && REQUIRED_KINDS.includes(kind)
}

const ITEM_KEYS: readonly ConsentItemKey[] = [
  'isAge14OrOlder',
  'terms',
  'privacy',
  'community',
  'location',
  'marketing',
]

export const hasAllRequiredConsents = (values: ConsentFormValues): boolean =>
  ITEM_KEYS.filter(isConsentItemRequired).every((key) => values[key])

// 폼 값 → POST /me/consents 요청. 필수가 빠지면 null
// 버전은 서버가 검증하는 shared CURRENT_CONSENT_VERSION (다르면 400 CONSENT_VERSION_MISMATCH)
export const buildConsentRequest = (values: ConsentFormValues): SubmitConsentsRequest | null => {
  if (!hasAllRequiredConsents(values)) return null
  const kinds = ITEM_KEYS.filter((key) => values[key]).flatMap((key) => {
    const kind = CONSENT_KIND_BY_ITEM[key]
    return kind ? [kind] : []
  })
  return { isAge14OrOlder: true, consents: kinds.map((kind) => ({ kind, version: CURRENT_CONSENT_VERSION })) }
}
