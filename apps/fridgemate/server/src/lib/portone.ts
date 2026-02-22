import * as PortOne from '@portone/server-sdk'

interface ChargeBillingKeyParams {
  billingKey: string
  paymentId: string
  amount: number
  orderName: string
}

interface PortonePaymentResponse {
  status: string
  id: string
  amount?: number
}

const getApiSecret = (): string => {
  const secret = process.env.PORTONE_API_SECRET
  if (!secret) throw new Error('PORTONE_API_SECRET가 설정되지 않았습니다.')
  return secret
}

const getStoreId = (): string => {
  const storeId = process.env.PORTONE_STORE_ID
  if (!storeId) throw new Error('PORTONE_STORE_ID가 설정되지 않았습니다.')
  return storeId
}

const getWebhookSecret = (): string => {
  const secret = process.env.PORTONE_WEBHOOK_SECRET
  if (!secret) throw new Error('PORTONE_WEBHOOK_SECRET가 설정되지 않았습니다.')
  return secret
}

export const isAvailable = (): boolean => {
  return !!(process.env.PORTONE_API_SECRET && process.env.PORTONE_STORE_ID)
}

export const chargeBillingKey = async (params: ChargeBillingKeyParams): Promise<PortonePaymentResponse> => {
  const { billingKey, paymentId, amount, orderName } = params

  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `PortOne ${getApiSecret()}`,
      },
      body: JSON.stringify({
        storeId: getStoreId(),
        billingKey,
        orderName,
        amount: { total: amount },
        currency: 'KRW',
      }),
    },
  )

  if (!response.ok) {
    console.error(`포트원 결제 실패: status=${response.status}`)
    throw new Error(`포트원 결제 실패: ${response.status}`)
  }

  return response.json()
}

export const getPayment = async (paymentId: string): Promise<PortonePaymentResponse> => {
  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `PortOne ${getApiSecret()}`,
      },
    },
  )

  if (!response.ok) {
    console.error(`포트원 결제 조회 실패: status=${response.status}`)
    throw new Error(`포트원 결제 조회 실패: ${response.status}`)
  }

  return response.json()
}

export const verifyWebhook = async (body: string, headers: Record<string, string>) => {
  try {
    return await PortOne.Webhook.verify(getWebhookSecret(), body, headers)
  } catch (error) {
    console.error('Webhook 서명 검증 실패', error)
    throw new Error('Webhook 서명 검증 실패')
  }
}
