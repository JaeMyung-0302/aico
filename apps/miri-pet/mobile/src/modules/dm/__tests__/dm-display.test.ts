import { makeMessage, ME_ID, PEER } from '../__fixtures__/dm'
import { conversationPreview, myReadLabel, parsePostShare, postShareBody } from '../util-dm/dm-display'

const POST_ID = '0199e3a0-0000-7000-8000-000000000070'

describe('dm-display', () => {
  it('목록 미리보기: 내 메시지는 "나: ", 사진만 있으면 "사진", 탈퇴·숨김 등 내용이 없으면 안내', () => {
    expect(conversationPreview(makeMessage({ body: '안녕' }), ME_ID)).toBe('안녕')
    expect(conversationPreview(makeMessage({ senderId: ME_ID, body: '다음에 같이 산책해요' }), ME_ID)).toBe(
      '나: 다음에 같이 산책해요',
    )
    expect(conversationPreview(makeMessage({ body: null, imageUrl: 'https://img.test/p/x/1440.jpg' }), ME_ID)).toBe(
      '사진',
    )
    expect(conversationPreview(makeMessage({ body: null, senderId: null }), ME_ID)).toBe('삭제된 메시지예요')
    expect(conversationPreview(null, ME_ID)).toBe('')
  })

  it('읽음 표시: 상대 lastRead 이하의 내 메시지는 "읽음", 아니면 "전송됨"', () => {
    const mine = makeMessage({ id: '0199e3a0-0000-7000-8000-000000000005', senderId: ME_ID })
    expect(myReadLabel(mine, '0199e3a0-0000-7000-8000-000000000005')).toBe('읽음')
    expect(myReadLabel(mine, '0199e3a0-0000-7000-8000-000000000009')).toBe('읽음')
    expect(myReadLabel(mine, '0199e3a0-0000-7000-8000-000000000004')).toBe('전송됨')
    expect(myReadLabel(mine, null)).toBe('전송됨')
  })

  it('게시물 공유 메시지: 링크를 만들고 다시 게시물 id로 읽는다', () => {
    const body = postShareBody({ id: POST_ID, author: PEER, caption: '첫 애견동반 카페 성공!' })
    expect(body).toContain(`miripet://posts/${POST_ID}`)
    expect(parsePostShare(body)).toBe(POST_ID)
    expect(parsePostShare('그냥 메시지')).toBeNull()
    expect(parsePostShare(null)).toBeNull()
  })
})
