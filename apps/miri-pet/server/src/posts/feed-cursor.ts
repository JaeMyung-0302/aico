// uuid v7 id는 시간순 → id 하나로 커서 페이지네이션. limit+1개를 읽어 다음 페이지 존재 여부를 안다
export type Page<T> = { items: T[]; nextCursor: string | null; hasMore: boolean }

export const toPage = <T extends { id: string }>(rows: readonly T[], limit: number): Page<T> => {
  const items = rows.slice(0, limit)
  const hasMore = rows.length > limit
  return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null, hasMore }
}

// 최신순(id DESC) 다음 페이지
export const cursorBefore = (cursor: string | undefined) => (cursor ? { id: { lt: cursor } } : {})

// 오래된순(id ASC) 다음 페이지 — 댓글
export const cursorAfter = (cursor: string | undefined) => (cursor ? { id: { gt: cursor } } : {})
