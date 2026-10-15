import { Linking } from 'react-native'
import { legalUrl, type LegalDocument } from './legal-urls'

// 약관 문서는 서버 /legal/*.html을 시스템 브라우저로 연다
export const openLegalDocument = (document: LegalDocument): void => {
  Linking.openURL(legalUrl(document)).catch(() => undefined)
}
