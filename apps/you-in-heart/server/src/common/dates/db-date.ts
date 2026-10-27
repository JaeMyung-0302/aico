// @db.Date 컬럼은 날짜만 저장한다 → 값은 shared isoDateSchema를 통과한 'YYYY-MM-DD' 문자열로만 만든다(0C 리뷰 규칙).
// Prisma는 Date의 UTC 날짜 부분을 저장하므로 UTC 자정으로 만들고, 읽을 때도 UTC로 자른다(KST 변환 금지)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const toDbDate = (ymd: string): Date => {
  const date = new Date(`${ymd}T00:00:00.000Z`)
  if (!DATE_PATTERN.test(ymd) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== ymd) {
    throw new RangeError(`잘못된 날짜: ${ymd}`)
  }
  return date
}

export const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10)
