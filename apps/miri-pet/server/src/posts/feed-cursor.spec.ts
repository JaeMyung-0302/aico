import { BadRequestException } from '@nestjs/common'
import { feedQuerySchema } from '@miri-pet/shared'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { cursorAfter, cursorBefore, toPage } from './feed-cursor'

const ID_A = '0199e3a0-0000-7000-8000-000000000001'
const ID_B = '0199e3a0-0000-7000-8000-000000000002'
const ID_C = '0199e3a0-0000-7000-8000-000000000003'

const rows = (ids: string[]) => ids.map((id) => ({ id }))

describe('feed cursor', () => {
  const pipe = new ZodValidationPipe(feedQuerySchema)
  const meta = { type: 'query' as const }

  it('limit+1개를 받으면 limit개만 돌려주고 마지막 항목 id가 다음 커서다', () => {
    const page = toPage(rows([ID_C, ID_B, ID_A]), 2)
    expect(page.items).toEqual(rows([ID_C, ID_B]))
    expect(page.nextCursor).toBe(ID_B)
    expect(page.hasMore).toBe(true)
  })

  it('limit 이하면 다음 커서는 null, hasMore false', () => {
    const page = toPage(rows([ID_B, ID_A]), 2)
    expect(page.items).toHaveLength(2)
    expect(page.nextCursor).toBeNull()
    expect(page.hasMore).toBe(false)
  })

  it('빈 결과도 커서 null', () => {
    expect(toPage([], 20)).toEqual({ items: [], nextCursor: null, hasMore: false })
  })

  it('커서 조건: 최신순은 id < cursor, 오래된순은 id > cursor, 없으면 조건 없음', () => {
    expect(cursorBefore(ID_B)).toEqual({ id: { lt: ID_B } })
    expect(cursorAfter(ID_B)).toEqual({ id: { gt: ID_B } })
    expect(cursorBefore(undefined)).toEqual({})
    expect(cursorAfter(undefined)).toEqual({})
  })

  it('쿼리 디코딩: 기본 limit 20, excludeFollowing 문자열 → boolean', () => {
    expect(pipe.transform({}, meta)).toEqual({ limit: 20, excludeFollowing: false })
    expect(pipe.transform({ cursor: ID_A, limit: '5', excludeFollowing: 'true' }, meta)).toEqual({
      cursor: ID_A,
      limit: 5,
      excludeFollowing: true,
    })
  })

  it.each([['not-a-uuid'], ['123'], ['']])('잘못된 커서 %p → 400', (cursor) => {
    expect(() => pipe.transform({ cursor }, meta)).toThrow(BadRequestException)
  })

  it('limit 범위 밖(0, 51)과 excludeFollowing 오타 → 400', () => {
    expect(() => pipe.transform({ limit: '0' }, meta)).toThrow(BadRequestException)
    expect(() => pipe.transform({ limit: '51' }, meta)).toThrow(BadRequestException)
    expect(() => pipe.transform({ excludeFollowing: 'yes' }, meta)).toThrow(BadRequestException)
  })
})
