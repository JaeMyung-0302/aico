import * as PortOne from '@portone/browser-sdk/v2'

const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string | undefined
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as
  | string
  | undefined

export const isPortoneConfigured = (): boolean => {
  return !!(STORE_ID && CHANNEL_KEY)
}

export const requestBillingKey = async (
  customerId: string,
  customerEmail: string,
): Promise<string> => {
  if (!STORE_ID || !CHANNEL_KEY) {
    throw new Error('포트원이 설정되지 않았습니다.')
  }

  const response = await PortOne.requestIssueBillingKey({
    storeId: STORE_ID,
    channelKey: CHANNEL_KEY,
    billingKeyMethod: 'EASY_PAY',
    issueName: 'KAKAOPAY',
    customer: {
      customerId,
      email: customerEmail,
    },
  })

  if (!response || response.code != null) {
    throw new Error(response?.message || '빌링키 발급에 실패했습니다.')
  }

  return response.billingKey
}
