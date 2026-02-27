export interface Keyword {
  id?: number
  keyword: string
  source: 'naver' | 'google' | 'news'
  score: number
  used: boolean
  createdAt: string
}

export interface CoupangProduct {
  productName: string
  productUrl: string
  productPrice: number
  imageUrl: string
}

export interface Post {
  id?: number
  keywordId: number
  title: string
  content: string
  metaDescription: string
  url: string | null
  status: 'generated' | 'published' | 'failed'
  tokenCost: number
  createdAt: string
}

export interface PublishResult {
  success: boolean
  url: string | null
  error: string | null
}

export interface PipelineResult {
  keywords: Keyword[]
  posts: Post[]
  publishResults: PublishResult[]
  totalTokenCost: number
}

export interface ContentBotConfig {
  naver: {
    clientId: string
    clientSecret: string
  }
  wordpress: {
    siteId: string
    accessToken: string
  }
  anthropic: {
    apiKey: string
  }
  telegram: {
    botToken: string
    chatId: string
  }
  coupang: {
    accessKey: string
    secretKey: string
  }
  pipeline: {
    dailyBudgetKrw: number
    maxPostsPerDay: number
    maxPostsPerRun: number
    cronSchedule: string
  }
}
