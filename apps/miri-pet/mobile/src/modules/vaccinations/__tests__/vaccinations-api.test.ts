import { CERTIFICATE_CONSENT_VERSION } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { agreeCertificateConsent } from '../data-access-vaccinations/vaccinations-api'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

describe('vaccinations-api', () => {
  it('증명서 보관 동의는 서버가 검증하는 공유 버전(CERTIFICATE_CONSENT_VERSION)으로 보낸다', async () => {
    await agreeCertificateConsent()
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/vaccinations/certificate-consent',
      data: { version: CERTIFICATE_CONSENT_VERSION },
    })
  })
})
