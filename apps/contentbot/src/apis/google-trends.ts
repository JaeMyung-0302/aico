import axios from 'axios'
import { parseStringPromise } from 'xml2js'
import type { Keyword } from '../types/index.js'

const AI_KEYWORDS = [
  'ai',
  '인공지능',
  'chatgpt',
  'gpt',
  'claude',
  'gemini',
  'llm',
  '딥러닝',
  '머신러닝',
  '생성ai',
  'copilot',
  'midjourney',
  'sora',
  'openai',
  'anthropic',
  'google ai',
  'ai 모델',
  'ai 도구',
  'ai 서비스',
  'ai 업데이트',
  '뤼튼',
  '클로드',
  '제미나이',
]

export const isAiRelated = (keyword: string): boolean => {
  const lower = keyword.toLowerCase()
  return AI_KEYWORDS.some((kw) => lower.includes(kw))
}

interface RssItem {
  title?: string[]
  'ht:approx_traffic'?: string[]
}

interface RssResponse {
  rss?: {
    channel?: Array<{
      item?: RssItem[]
    }>
  }
}

const parseTrafficVolume = (traffic: string | undefined): number => {
  if (!traffic) return 0
  const cleaned = traffic.replace(/[^0-9KMk+]/g, '').toUpperCase()
  if (cleaned.includes('M')) return 1000000
  if (cleaned.includes('K')) {
    const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10)
    return isNaN(num) ? 1000 : num * 1000
  }
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10)
  return isNaN(num) ? 0 : num
}

export const fetchGoogleTrends = async (): Promise<Keyword[]> => {
  try {
    const response = await axios.get<string>(
      'https://trends.google.com/trending/rss?geo=KR',
      {
        responseType: 'text',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
        },
      },
    )

    const parsed: RssResponse = await parseStringPromise(response.data)
    const items = parsed.rss?.channel?.[0]?.item ?? []

    const allItems = items
      .filter((item): item is RssItem & { title: string[] } => {
        return Array.isArray(item.title) && item.title.length > 0
      })
      .map((item) => {
        const title = item.title[0] ?? ''
        const traffic = item['ht:approx_traffic']?.[0]
        const score = parseTrafficVolume(traffic)

        return {
          keyword: title,
          source: 'google' as const,
          score,
          used: false,
          createdAt: new Date().toISOString(),
        }
      })
      .filter((kw) => kw.keyword.length > 0)

    const filtered = allItems.filter((kw) => isAiRelated(kw.keyword))
    console.log(
      `[Google Trends] AI 필터: ${allItems.length}개 → ${filtered.length}개 통과`,
    )
    return filtered
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[Google Trends] RSS fetch error: ${error.message}`)
    } else {
      console.error('[Google Trends] Parse error:', error)
    }
    return []
  }
}
