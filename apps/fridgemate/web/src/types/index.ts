// === Enums (서버와 동기화) ===

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

// === Subscription/Payment ===

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  PAST_DUE: 'PAST_DUE',
} as const
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

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
  compartments?: CompartmentPreset[]
}

export interface UpdateFridgeInput {
  name: string
}

export interface UpdateCompartmentsInput {
  compartments: CompartmentPreset[]
}

// === 유통기한 상태 계산 ===

export const getExpiryStatus = (
  expiryDate: Date | string | null,
): ExpiryStatus => {
  if (!expiryDate) return ExpiryStatus.SAFE

  const date =
    typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expiry = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays <= 0) return ExpiryStatus.EXPIRED
  if (diffDays <= 1) return ExpiryStatus.DANGER
  if (diffDays <= 3) return ExpiryStatus.WARNING
  return ExpiryStatus.SAFE
}

// 유통기한까지 남은 일수 계산
export const getDaysUntilExpiry = (
  expiryDate: string | null,
): number | null => {
  if (!expiryDate) return null

  const date = new Date(expiryDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expiry = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
}

// === Zone 그룹핑 (영역별 칸 분류) ===

export interface ZoneDefinition {
  name: string
  positionStart: number
  positionEnd: number
}

export const ZONE_MAPPINGS: Partial<Record<FridgeType, ZoneDefinition[]>> = {
  [FridgeType.SIDE_BY_SIDE]: [
    { name: '냉장 본체', positionStart: 0, positionEnd: 4 },
    { name: '냉장 문 수납', positionStart: 5, positionEnd: 9 },
    { name: '냉동 본체', positionStart: 10, positionEnd: 14 },
    { name: '냉동 문 수납', positionStart: 15, positionEnd: 19 },
  ],
  [FridgeType.FOUR_DOOR]: [
    { name: '좌측 상단', positionStart: 0, positionEnd: 2 },
    { name: '좌측 하단', positionStart: 3, positionEnd: 5 },
    { name: '우측 상단', positionStart: 6, positionEnd: 8 },
    { name: '우측 하단', positionStart: 9, positionEnd: 11 },
    { name: '하단 서랍', positionStart: 12, positionEnd: 13 },
  ],
}

export const COMPARTMENT_TYPE_COLORS: Record<CompartmentType, string> = {
  [CompartmentType.FREEZER]: '#3B82F6',
  [CompartmentType.FRIDGE_UPPER]: '#22C55E',
  [CompartmentType.FRIDGE_LOWER]: '#22C55E',
  [CompartmentType.DOOR]: '#F59E0B',
  [CompartmentType.DRAWER]: '#8B5CF6',
  [CompartmentType.VEGGIE]: '#10B981',
}

// === 냉장고 타입별 칸 프리셋 ===

export interface CompartmentPreset {
  type: CompartmentType
  label: string
  position: number
  column?: 1 | 2
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
}

export const FRIDGE_TYPE_DESCRIPTIONS: Record<FridgeType, string> = {
  [FridgeType.ONE_DOOR]: '냉장 2칸 + 문 수납 1칸 (3칸)',
  [FridgeType.TWO_DOOR]: '냉장 3칸 + 문 수납 3칸 + 냉동 3칸 (9칸)',
  [FridgeType.SIDE_BY_SIDE]: '냉장 10칸 + 냉동 10칸 (20칸)',
  [FridgeType.FOUR_DOOR]: '좌우 6칸 + 하단 2칸 (14칸)',
}

export const COMPARTMENT_TYPE_LABELS: Record<CompartmentType, string> = {
  [CompartmentType.FRIDGE_UPPER]: '냉장실',
  [CompartmentType.FRIDGE_LOWER]: '냉장실 하단',
  [CompartmentType.FREEZER]: '냉동실',
  [CompartmentType.DOOR]: '문 수납',
  [CompartmentType.DRAWER]: '서랍',
  [CompartmentType.VEGGIE]: '채소칸',
}
