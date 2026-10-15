import { requestApi } from '@/shared/api/api-client'
import { fetchMyConsents, updateConsent, withdrawCertificateConsent } from '../data-access-consents/consents-api'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(requestApi).mockResolvedValue(undefined)
})

describe('consents-api', () => {
  it('GET /me/consents', async () => {
    await fetchMyConsents()
    expect(requestApi).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', url: '/me/consents' }))
  })

  it('PATCH /me/consents/:kind { agreed }', async () => {
    await updateConsent({ kind: 'LOCATION', isAgreed: false })
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PATCH', url: '/me/consents/LOCATION', data: { agreed: false } }),
    )
  })

  it('증명서 보관 동의 철회는 기존 DELETE /vaccinations/certificate-consent', async () => {
    await withdrawCertificateConsent()
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/vaccinations/certificate-consent' }),
    )
  })
})
