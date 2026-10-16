import { blockListSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { blockUser, createReport, fetchBlockedUsers, unblockUser } from '../data-access-moderation/moderation-api'

const USER_ID = '01890a5d-ac96-774b-bcce-b302099a8057'
const mockBlockedUser = { id: USER_ID, nickname: 'bori', avatarUrl: null }

// 네트워크 진입점만 대체한다 (GET /blocks 응답 형태: { items })
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => ({ items: [mockBlockedUser] })) }))

describe('moderation-api', () => {
  it('신고는 POST /reports { targetType, targetId, reason }', async () => {
    await createReport({ targetType: 'USER', targetId: USER_ID, reason: 'SPAM' })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/reports',
      data: { targetType: 'USER', targetId: USER_ID, reason: 'SPAM' },
    })
  })

  it('차단·해제는 /blocks/:userId 에 POST·DELETE', async () => {
    await blockUser(USER_ID)
    await unblockUser(USER_ID)
    expect(requestApi).toHaveBeenCalledWith({ method: 'POST', url: `/blocks/${USER_ID}` })
    expect(requestApi).toHaveBeenCalledWith({ method: 'DELETE', url: `/blocks/${USER_ID}` })
  })

  it('차단 목록은 GET /blocks 를 shared blockListSchema로 검증하고 사용자 배열을 돌려준다', async () => {
    await expect(fetchBlockedUsers()).resolves.toEqual([mockBlockedUser])
    expect(requestApi).toHaveBeenCalledWith({ method: 'GET', url: '/blocks', schema: blockListSchema })
  })
})
