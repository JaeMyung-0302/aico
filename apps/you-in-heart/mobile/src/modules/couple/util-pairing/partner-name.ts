import type { Couple } from '@you-in-heart/shared'

const FALLBACK_NAME = '상대'

// 홈 상단·연결 완료 문구 "재명 · [이름]"
export const findPartnerName = (couple: Couple | undefined, myUserId: string | undefined): string => {
  const partner = couple?.members.find((member) => member.userId !== myUserId)
  return partner?.displayName || FALLBACK_NAME
}
