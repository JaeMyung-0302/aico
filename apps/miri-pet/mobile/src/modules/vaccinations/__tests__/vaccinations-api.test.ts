import { CERTIFICATE_CONSENT_VERSION } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import {
  agreeCertificateConsent,
  deleteVaccination,
  updateVaccination,
} from '../data-access-vaccinations/vaccinations-api'

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

  it('기록 수정은 PATCH /vaccinations/:id, 삭제는 DELETE /vaccinations/:id', async () => {
    const body = { administeredOn: '2026-10-01', nextDueOn: null }
    await updateVaccination('v-1', body)
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PATCH', url: '/vaccinations/v-1', data: body }),
    )
    await deleteVaccination('v-1')
    expect(requestApi).toHaveBeenCalledWith({ method: 'DELETE', url: '/vaccinations/v-1' })
  })
})
