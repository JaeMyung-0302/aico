const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const pad = (value: number) => String(value).padStart(2, '0')

const kstParts = (iso: string) => {
  const kst = new Date(Date.parse(iso) + KST_OFFSET_MS)
  return {
    date: `${kst.getUTCFullYear()}. ${pad(kst.getUTCMonth() + 1)}. ${pad(kst.getUTCDate())}`,
    hour: kst.getUTCHours(),
    minute: kst.getUTCMinutes(),
  }
}

// SCR-13 "2026. 03. 14"
export const formatQuoteDay = (iso: string): string => kstParts(iso).date

// SCR-13 "2026. 03. 14 오후 11:42" (카톡처럼 12시간제)
export const formatQuoteDateTime = (iso: string): string => {
  const { date, hour, minute } = kstParts(iso)
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${date} ${hour < 12 ? '오전' : '오후'} ${hour12}:${pad(minute)}`
}
