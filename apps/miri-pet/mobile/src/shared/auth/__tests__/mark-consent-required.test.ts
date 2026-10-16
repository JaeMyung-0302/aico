import { QueryClient } from '@tanstack/react-query'
import { markConsentRequired } from '../mark-consent-required'
import { ME_QUERY_KEY } from '../query-keys'

const ME = { id: '01890a5d-ac96-774b-bcce-b302099a8057', nickname: 'bori', hasRequiredConsents: true }

describe('markConsentRequired (403 CONSENT_REQUIRED)', () => {
  it('캐시된 /me를 동의 필요 상태로 바꿔 인증 게이트가 /consent로 보내게 한다', () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    client.setQueryData(ME_QUERY_KEY, ME)

    markConsentRequired(client)

    expect(client.getQueryData(ME_QUERY_KEY)).toEqual({ ...ME, hasRequiredConsents: false })
  })

  it('/me가 아직 없으면 캐시를 만들지 않는다 (게이트가 /me를 받아 판단)', () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    markConsentRequired(client)
    expect(client.getQueryData(ME_QUERY_KEY)).toBeUndefined()
  })
})
