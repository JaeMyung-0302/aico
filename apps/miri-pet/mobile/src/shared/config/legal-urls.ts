import { API_BASE_URL } from './api-base-url'

// 서버가 API prefix 밖에서 서빙하는 약관 문서: /legal/{terms,privacy,location}
// TODO(server): 커뮤니티 이용 수칙 문서가 추가되면 'community'를 넣는다
export type LegalDocument = 'terms' | 'privacy' | 'location'

const API_VERSION_PATH = /\/api\/v\d+\/?$/

export const toLegalUrl = (apiBaseUrl: string, document: LegalDocument): string =>
  `${apiBaseUrl.replace(API_VERSION_PATH, '').replace(/\/$/, '')}/legal/${document}`

export const legalUrl = (document: LegalDocument): string => toLegalUrl(API_BASE_URL, document)
