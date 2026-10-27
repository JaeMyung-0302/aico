import type { CreateQuoteRequest, Quote } from '@you-in-heart/shared'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessionStatus } from '@/shared/auth/session'
import { createQuote, deleteQuote, fetchQuotePage } from './quote-api'

// 보관함·홈 카드가 같이 쓴다. 저장·삭제·가져오기 뒤 무효화한다
export const QUOTES_QUERY_KEY = ['quotes'] as const

const HOME_SAMPLE_SIZE = 20
const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const firstPage = (): string | undefined => undefined

export const useQuotes = () => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useInfiniteQuery({
    queryKey: [...QUOTES_QUERY_KEY, 'list'],
    queryFn: ({ pageParam }) => fetchQuotePage({ cursor: pageParam }),
    initialPageParam: firstPage(),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isSignedIn,
  })
}

// SCR-03 홈 "간직한 문구": 최근 텍스트 문구 중 하나를 KST 날짜마다 바꿔 보여준다(없으면 null)
export const pickDailyQuote = (quotes: readonly Quote[], nowMs: number): Quote | null => {
  const texts = quotes.filter((quote) => quote.text)
  if (texts.length === 0) return null
  const day = Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS)
  return texts[day % texts.length] ?? null
}

export const useHomeQuotes = ({ isEnabled }: { isEnabled: boolean }) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({
    queryKey: [...QUOTES_QUERY_KEY, 'home'],
    queryFn: async () => (await fetchQuotePage({ limit: HOME_SAMPLE_SIZE })).items,
    enabled: isSignedIn && isEnabled,
  })
}

const useInvalidateQuotes = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY })
}

export const useCreateQuote = () => {
  const invalidate = useInvalidateQuotes()
  return useMutation({ mutationFn: (body: CreateQuoteRequest) => createQuote(body), onSuccess: invalidate })
}

export const useDeleteQuote = () => {
  const invalidate = useInvalidateQuotes()
  return useMutation({ mutationFn: (quoteId: string) => deleteQuote(quoteId), onSuccess: invalidate })
}
