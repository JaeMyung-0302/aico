export interface User {
  id: string
  email: string
  nickname: string | null
  provider: string
  isPremium: boolean
  isAdmin: boolean
  premiumExpiresAt: string | null
  createdAt: string
}

export interface QuotaStatus {
  allowed: boolean
  remaining: number // -1 = 무제한
  isPremium: boolean
}

export interface SavedRecipe {
  id: string
  recipeId: string
  recipe: {
    id: string
    title: string
    thumbnailUrl: string | null
    totalPrice: number | null
    difficulty: string | null
  }
  createdAt: string
}

export interface AnalysisHistoryItem {
  id: string
  recipeId: string
  videoUrl: string
  recipe: {
    id: string
    title: string
    thumbnailUrl: string | null
  }
  createdAt: string
}

export interface SubscriptionInfo {
  hasSubscription: boolean
  status: 'ACTIVE' | 'CANCELLED' | null
  currentPeriodEnd: string | null
}
