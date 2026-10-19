import { act, renderHook } from '@testing-library/react-native'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { withdrawCertificateConsent } from '../data-access-consents/consents-api'
import { MY_CONSENTS_QUERY_KEY, useWithdrawCertificateConsent } from '../data-access-consents/useMyConsents'

jest.mock('../data-access-consents/consents-api', () => ({ withdrawCertificateConsent: jest.fn() }))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'

describe('증명서 보관 동의 철회', () => {
  it('철회하면 동의 내역과 함께 접종 기록(증명서 수·원본) 캐시도 다시 받는다', async () => {
    jest
      .mocked(withdrawCertificateConsent)
      .mockResolvedValue({ withdrawnAt: '2026-10-05T03:00:00.000Z', deletedCertificateCount: 2 })
    const client = createTestQueryClient()
    client.setQueryData(['vaccinations', 'pet', PET_ID], [])
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = await renderHook(() => useWithdrawCertificateConsent(), {
      wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MY_CONSENTS_QUERY_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vaccinations'] })
    expect(client.getQueryState(['vaccinations', 'pet', PET_ID])?.isInvalidated).toBe(true)
  })
})
