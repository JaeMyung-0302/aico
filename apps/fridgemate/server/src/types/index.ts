// === Enums (Prisma 스키마와 동기화) ===

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
  const expiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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
