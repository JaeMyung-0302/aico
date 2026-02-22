// === Enums (서버와 동기화) ===

export const FridgeType = {
  ONE_DOOR: 'ONE_DOOR',
  TWO_DOOR: 'TWO_DOOR',
  SIDE_BY_SIDE: 'SIDE_BY_SIDE',
  FOUR_DOOR: 'FOUR_DOOR',
  MINI: 'MINI',
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
export type CompartmentType = (typeof CompartmentType)[keyof typeof CompartmentType]

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

// === Subscription/Payment ===

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  PAST_DUE: 'PAST_DUE',
} as const
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export interface SubscriptionStatusResponse {
  hasSubscription: boolean
  status: SubscriptionStatus | null
  currentPeriodEnd: string | null
  isPremium: boolean
}

// === JoinRequest ===

export const JoinRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type JoinRequestStatus = (typeof JoinRequestStatus)[keyof typeof JoinRequestStatus]

export interface JoinRequestResponse {
  id: string
  userId: string
  groupId: string
  status: JoinRequestStatus
  userName: string
  userEmail: string
  createdAt: string
}

// === Auth 인터페이스 ===

export interface AuthUser {
  id: string
  email: string
  name: string
  groupId: string | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface GroupJoinResponse extends AuthResponse {
  group: { id: string; name: string }
}

export interface GroupCreateResponse extends AuthResponse {
  group: { id: string; name: string; code: string }
}

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
  foodItems: { id: string; name: string; expiryDate: string | null }[]
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

export interface CreateFridgeInput {
  type: FridgeType
  name: string
}

export interface UpdateFridgeInput {
  name: string
}

// === 유통기한 상태 계산 ===

export const getExpiryStatus = (expiryDate: Date | string | null): ExpiryStatus => {
  if (!expiryDate) return ExpiryStatus.SAFE

  const date = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expiry = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return ExpiryStatus.EXPIRED
  if (diffDays <= 1) return ExpiryStatus.DANGER
  if (diffDays <= 3) return ExpiryStatus.WARNING
  return ExpiryStatus.SAFE
}

// 유통기한까지 남은 일수 계산
export const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null

  const date = new Date(expiryDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expiry = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// === 냉장고 타입별 칸 프리셋 ===

export interface CompartmentPreset {
  type: CompartmentType
  label: string
  position: number
}

export const COMPARTMENT_PRESETS: Record<FridgeType, CompartmentPreset[]> = {
  [FridgeType.ONE_DOOR]: [
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장실 상단', position: 0 },
    { type: CompartmentType.FRIDGE_LOWER, label: '냉장실 하단', position: 1 },
    { type: CompartmentType.FREEZER, label: '냉동실', position: 2 },
    { type: CompartmentType.DOOR, label: '문 수납', position: 3 },
  ],
  [FridgeType.TWO_DOOR]: [
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장실 상단', position: 0 },
    { type: CompartmentType.FRIDGE_LOWER, label: '냉장실 하단', position: 1 },
    { type: CompartmentType.FREEZER, label: '냉동실', position: 2 },
    { type: CompartmentType.DOOR, label: '문 수납', position: 3 },
    { type: CompartmentType.DRAWER, label: '서랍', position: 4 },
    { type: CompartmentType.VEGGIE, label: '채소칸', position: 5 },
  ],
  [FridgeType.SIDE_BY_SIDE]: [
    // 냉동실 도어 (5칸)
    { type: CompartmentType.DOOR, label: '냉동도어 1', position: 0 },
    { type: CompartmentType.DOOR, label: '냉동도어 2', position: 1 },
    { type: CompartmentType.DOOR, label: '냉동도어 3', position: 2 },
    { type: CompartmentType.DOOR, label: '냉동도어 4', position: 3 },
    { type: CompartmentType.DOOR, label: '냉동도어 5', position: 4 },
    // 냉동실 본체 (4칸 + 서랍 2칸)
    { type: CompartmentType.FREEZER, label: '냉동 1', position: 5 },
    { type: CompartmentType.FREEZER, label: '냉동 2', position: 6 },
    { type: CompartmentType.FREEZER, label: '냉동 3', position: 7 },
    { type: CompartmentType.FREEZER, label: '냉동 4', position: 8 },
    { type: CompartmentType.DRAWER, label: '냉동서랍 1', position: 9 },
    { type: CompartmentType.DRAWER, label: '냉동서랍 2', position: 10 },
    // 냉장실 본체 (4칸 + 서랍 2칸)
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 1', position: 11 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 2', position: 12 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 3', position: 13 },
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장 4', position: 14 },
    { type: CompartmentType.DRAWER, label: '냉장서랍 1', position: 15 },
    { type: CompartmentType.DRAWER, label: '냉장서랍 2', position: 16 },
    // 쇼케이스 도어 (6칸)
    { type: CompartmentType.DOOR, label: '쇼케이스 1', position: 17 },
    { type: CompartmentType.DOOR, label: '쇼케이스 2', position: 18 },
    { type: CompartmentType.DOOR, label: '쇼케이스 3', position: 19 },
    { type: CompartmentType.DOOR, label: '쇼케이스 4', position: 20 },
    { type: CompartmentType.DOOR, label: '쇼케이스 5', position: 21 },
    { type: CompartmentType.DOOR, label: '쇼케이스 6', position: 22 },
  ],
  [FridgeType.FOUR_DOOR]: [
    // 좌측 상단 (3칸)
    { type: CompartmentType.FRIDGE_UPPER, label: '좌상 1', position: 0 },
    { type: CompartmentType.FRIDGE_UPPER, label: '좌상 2', position: 1 },
    { type: CompartmentType.FRIDGE_UPPER, label: '좌상 3', position: 2 },
    // 좌측 하단 (3칸)
    { type: CompartmentType.FRIDGE_LOWER, label: '좌하 1', position: 3 },
    { type: CompartmentType.FRIDGE_LOWER, label: '좌하 2', position: 4 },
    { type: CompartmentType.FRIDGE_LOWER, label: '좌하 3', position: 5 },
    // 우측 상단 (3칸)
    { type: CompartmentType.FRIDGE_UPPER, label: '우상 1', position: 6 },
    { type: CompartmentType.FRIDGE_UPPER, label: '우상 2', position: 7 },
    { type: CompartmentType.FRIDGE_UPPER, label: '우상 3', position: 8 },
    // 우측 하단 (3칸)
    { type: CompartmentType.FRIDGE_LOWER, label: '우하 1', position: 9 },
    { type: CompartmentType.FRIDGE_LOWER, label: '우하 2', position: 10 },
    { type: CompartmentType.FRIDGE_LOWER, label: '우하 3', position: 11 },
    // 하단 서랍 (2칸)
    { type: CompartmentType.DRAWER, label: '하칸 좌', position: 12 },
    { type: CompartmentType.DRAWER, label: '하칸 우', position: 13 },
  ],
  [FridgeType.MINI]: [
    { type: CompartmentType.FRIDGE_UPPER, label: '냉장실', position: 0 },
    { type: CompartmentType.FREEZER, label: '냉동실', position: 1 },
    { type: CompartmentType.DOOR, label: '문 수납', position: 2 },
  ],
}

// === 카테고리 아이콘 (이모지) ===

export const FOOD_CATEGORY_ICONS: Record<FoodCategory, string> = {
  [FoodCategory.MEAT]: '🥩',
  [FoodCategory.SEAFOOD]: '🐟',
  [FoodCategory.DAIRY]: '🧀',
  [FoodCategory.VEGETABLE]: '🥬',
  [FoodCategory.SEASONING]: '🧂',
  [FoodCategory.BEVERAGE]: '🥤',
  [FoodCategory.SNACK]: '🍪',
  [FoodCategory.SIDE_DISH]: '🍱',
  [FoodCategory.OTHER]: '📦',
}

// === 충전도 레벨 (0: 빈, 1: 소량, 2: 보통, 3: 가득) ===

export const getFillLevel = (itemCount: number): 0 | 1 | 2 | 3 => {
  if (itemCount <= 0) return 0
  if (itemCount <= 2) return 1
  if (itemCount <= 5) return 2
  return 3
}

// === 카테고리 한글 라벨 ===

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  [FoodCategory.MEAT]: '육류',
  [FoodCategory.SEAFOOD]: '수산물',
  [FoodCategory.DAIRY]: '유제품',
  [FoodCategory.VEGETABLE]: '채소/과일',
  [FoodCategory.SEASONING]: '양념',
  [FoodCategory.BEVERAGE]: '음료',
  [FoodCategory.SNACK]: '간식',
  [FoodCategory.SIDE_DISH]: '반찬',
  [FoodCategory.OTHER]: '기타',
}

// === 냉장고 타입 한글 라벨 ===

export const FRIDGE_TYPE_LABELS: Record<FridgeType, string> = {
  [FridgeType.ONE_DOOR]: '1도어',
  [FridgeType.TWO_DOOR]: '2도어',
  [FridgeType.SIDE_BY_SIDE]: '양문형',
  [FridgeType.FOUR_DOOR]: '4도어',
  [FridgeType.MINI]: '미니',
}

export const FRIDGE_TYPE_DESCRIPTIONS: Record<FridgeType, string> = {
  [FridgeType.ONE_DOOR]: '냉장 + 냉동 + 문 수납 (4칸)',
  [FridgeType.TWO_DOOR]: '냉장 + 냉동 + 서랍 + 채소칸 (6칸)',
  [FridgeType.SIDE_BY_SIDE]: '냉동 도어·본체 + 냉장 본체·쇼케이스 (23칸)',
  [FridgeType.FOUR_DOOR]: '좌우 6칸 + 하단 2칸 (14칸)',
  [FridgeType.MINI]: '소형 냉장고 (3칸)',
}
