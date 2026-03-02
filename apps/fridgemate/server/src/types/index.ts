// === Enums (Prisma 스키마와 동기화) ===

export const FridgeType = {
  ONE_DOOR: 'ONE_DOOR',
  TWO_DOOR: 'TWO_DOOR',
  SIDE_BY_SIDE: 'SIDE_BY_SIDE',
  FOUR_DOOR: 'FOUR_DOOR',
} as const
export type FridgeType = (typeof FridgeType)[keyof typeof FridgeType]

export const CompartmentType = {
  FRIDGE_UPPER: 'FRIDGE_UPPER',
  FRIDGE_LOWER: 'FRIDGE_LOWER',
  FREEZER: 'FREEZER',
  DOOR: 'DOOR',
  DRAWER: 'DRAWER',
  VEGGIE: 'VEGGIE',
} as const
export type CompartmentType =
  (typeof CompartmentType)[keyof typeof CompartmentType]

export const FoodCategory = {
  MEAT: 'MEAT',
  SEAFOOD: 'SEAFOOD',
  DAIRY: 'DAIRY',
  VEGETABLE: 'VEGETABLE',
  SEASONING: 'SEASONING',
  BEVERAGE: 'BEVERAGE',
  SNACK: 'SNACK',
  SIDE_DISH: 'SIDE_DISH',
  OTHER: 'OTHER',
} as const
export type FoodCategory = (typeof FoodCategory)[keyof typeof FoodCategory]

export const ExpiryStatus = {
  SAFE: 'SAFE',
  WARNING: 'WARNING',
  DANGER: 'DANGER',
  EXPIRED: 'EXPIRED',
} as const
export type ExpiryStatus = (typeof ExpiryStatus)[keyof typeof ExpiryStatus]

// === Response 인터페이스 ===

export interface GroupResponse {
  id: string
  code: string
  name: string
}

export interface FridgeResponse {
  id: string
  groupId: string
  type: FridgeType
  name: string
  compartments: CompartmentResponse[]
}

export interface CompartmentResponse {
  id: string
  fridgeId: string
  type: CompartmentType
  label: string
  position: number
  itemCount: number
  hasExpiringItems: boolean
}

export interface FoodItemResponse {
  id: string
  compartmentId: string
  name: string
  category: FoodCategory
  quantity: number | null
  unit: string | null
  expiryDate: string | null
  memo: string | null
  expiryStatus: ExpiryStatus
  createdAt: string
  updatedAt: string
}

// === JoinRequest ===

export const JoinRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type JoinRequestStatus =
  (typeof JoinRequestStatus)[keyof typeof JoinRequestStatus]

export interface JoinRequestResponse {
  id: string
  userId: string
  groupId: string
  status: JoinRequestStatus
  userName: string
  userEmail: string
  createdAt: string
}

// === Subscription/Payment ===

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  PAST_DUE: 'PAST_DUE',
} as const
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export interface SubscriptionStatusResponse {
  hasSubscription: boolean
  status: SubscriptionStatus | null
  currentPeriodEnd: string | null
  isPremium: boolean
}

// === Push Subscription ===

export interface PushSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// === 레시피 추천 인터페이스 ===

export interface RecipeIngredient {
  name: string
  amount: string
  unit: string
  inFridge: boolean
}

export interface RecipeSuggestion {
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  cookTime: number // 분
  ingredients: RecipeIngredient[]
  steps: string[]
}

export interface RecipeSuggestResponse {
  recipes: RecipeSuggestion[]
  cached: boolean
  remainingCount: number
}

// === Request 인터페이스 ===

export interface RecipeSuggestRequest {
  selectedItemIds?: string[]
}

// === Input 인터페이스 ===

export interface CreateFoodItemInput {
  name: string
  category?: FoodCategory
  quantity?: number | null
  unit?: string | null
  expiryDate?: string | null
  memo?: string | null
}

export interface UpdateFoodItemInput {
  name?: string
  category?: FoodCategory
  quantity?: number | null
  unit?: string | null
  expiryDate?: string | null
  memo?: string | null
}

// === 유통기한 상태 계산 ===

export const getExpiryStatus = (expiryDate: Date | null): ExpiryStatus => {
  if (!expiryDate) return ExpiryStatus.SAFE

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expiry = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate(),
  )
  const diffDays = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays <= 0) return ExpiryStatus.EXPIRED
  if (diffDays <= 1) return ExpiryStatus.DANGER
  if (diffDays <= 3) return ExpiryStatus.WARNING
  return ExpiryStatus.SAFE
}

// === 냉장고 타입별 칸 프리셋 ===

export interface CompartmentPreset {
  type: CompartmentType
  label: string
  position: number
}

export const COMPARTMENT_PRESETS: Record<FridgeType, CompartmentPreset[]> = {
  [FridgeType.ONE_DOOR]: [
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 1', position: 0 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 2', position: 1 },
    { type: CompartmentType.DOOR, label: '문 수납 1', position: 2 },
  ],
  [FridgeType.TWO_DOOR]: [
    // 냉장실 본체 (3칸)
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 1', position: 0 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 2', position: 1 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 3', position: 2 },
    // 냉장실 도어 (3칸)
    { type: CompartmentType.DOOR, label: '문 수납 1', position: 3 },
    { type: CompartmentType.DOOR, label: '문 수납 2', position: 4 },
    { type: CompartmentType.DOOR, label: '문 수납 3', position: 5 },
    // 냉동실 (3칸)
    { type: CompartmentType.FREEZER, label: '냉동 1', position: 6 },
    { type: CompartmentType.FREEZER, label: '냉동 2', position: 7 },
    { type: CompartmentType.FREEZER, label: '냉동 3', position: 8 },
  ],
  [FridgeType.SIDE_BY_SIDE]: [
    // 냉장실 본체 (5칸)
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 1', position: 0 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 2', position: 1 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 3', position: 2 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 4', position: 3 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 5', position: 4 },
    // 냉장실 문 수납 (5칸)
    { type: CompartmentType.DOOR, label: '문 수납 1', position: 5 },
    { type: CompartmentType.DOOR, label: '문 수납 2', position: 6 },
    { type: CompartmentType.DOOR, label: '문 수납 3', position: 7 },
    { type: CompartmentType.DOOR, label: '문 수납 4', position: 8 },
    { type: CompartmentType.DOOR, label: '문 수납 5', position: 9 },
    // 냉동실 본체 (5칸)
    { type: CompartmentType.FREEZER, label: '냉동 1', position: 10 },
    { type: CompartmentType.FREEZER, label: '냉동 2', position: 11 },
    { type: CompartmentType.FREEZER, label: '냉동 3', position: 12 },
    { type: CompartmentType.FREEZER, label: '냉동 4', position: 13 },
    { type: CompartmentType.FREEZER, label: '냉동 5', position: 14 },
    // 냉동실 문 수납 (5칸)
    { type: CompartmentType.DOOR, label: '문 수납 1', position: 15 },
    { type: CompartmentType.DOOR, label: '문 수납 2', position: 16 },
    { type: CompartmentType.DOOR, label: '문 수납 3', position: 17 },
    { type: CompartmentType.DOOR, label: '문 수납 4', position: 18 },
    { type: CompartmentType.DOOR, label: '문 수납 5', position: 19 },
  ],
  [FridgeType.FOUR_DOOR]: [
    // 냉동실 본체 (3칸)
    { type: CompartmentType.FREEZER, label: '냉동 1', position: 0 },
    { type: CompartmentType.FREEZER, label: '냉동 2', position: 1 },
    { type: CompartmentType.FREEZER, label: '냉동 3', position: 2 },
    // 냉동실 문 수납 (3칸)
    { type: CompartmentType.DOOR, label: '문 수납 1', position: 3 },
    { type: CompartmentType.DOOR, label: '문 수납 2', position: 4 },
    { type: CompartmentType.DOOR, label: '문 수납 3', position: 5 },
    // 냉장실 본체 (3칸)
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 1', position: 6 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 2', position: 7 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 3', position: 8 },
    // 냉장실 문 수납 (3칸)
    { type: CompartmentType.DOOR, label: '문 수납 1', position: 9 },
    { type: CompartmentType.DOOR, label: '문 수납 2', position: 10 },
    { type: CompartmentType.DOOR, label: '문 수납 3', position: 11 },
    // 하단 김치칸 (2칸)
    { type: CompartmentType.VEGGIE, label: '김치칸 1', position: 12 },
    { type: CompartmentType.VEGGIE, label: '김치칸 2', position: 13 },
  ],
}
