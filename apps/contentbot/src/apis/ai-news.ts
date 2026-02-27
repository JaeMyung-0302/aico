import axios from 'axios'
import { parseStringPromise } from 'xml2js'
import type { Keyword } from '../types/index.js'

const NEWS_QUERIES = ['Claude AI', 'GPT', 'Gemini AI']

interface NewsRssItem {
  title?: string[]
}

interface NewsRssResponse {
  rss?: { channel?: Array<{ item?: NewsRssItem[] }> }
}

const fetchNewsForQuery = async (query: string): Promise<Keyword[]> => {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`
  const response = await axios.get<string>(url, {
    responseType: 'text',
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)' },
  })

  const parsed: NewsRssResponse = await parseStringPromise(response.data)
  const items = parsed.rss?.channel?.[0]?.item ?? []

  return items
    .slice(0, 3)
    .filter(
      (item): item is NewsRssItem & { title: string[] } =>
        Array.isArray(item.title) && item.title.length > 0,
    )
    .map((item) => ({
      keyword: item.title[0] ?? '',
      source: 'news' as const,
      score: 0,
      used: false,
      createdAt: new Date().toISOString(),
    }))
    .filter((kw) => kw.keyword.length > 0)
}

export const fetchAiNews = async (): Promise<Keyword[]> => {
  const results = await Promise.allSettled(
    NEWS_QUERIES.map((q) => fetchNewsForQuery(q)),
  )

  const keywords = results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value
    console.error(`[AI News] "${NEWS_QUERIES[i]}" 수집 실패:`, result.reason)
    return []
  })

  console.log(`[AI News] 수집: ${keywords.length}개`)
  return keywords
}
