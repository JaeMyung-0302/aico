import { FridgeType, CompartmentType, COMPARTMENT_PRESETS } from '@/types'
import type { CompartmentPreset } from '@/types'

// === 도어 섹션 정의 (SIDE_BY_SIDE, FOUR_DOOR) ===

export interface DoorSection {
  label: string
  positions: number[]
  layout: 'twoColumn' | 'column' | 'grid3x2' | 'grid2x1'
  columnSplit?: number
  isFreezer?: boolean
  spanFull?: boolean
}

export const DOOR_SECTIONS: Partial<Record<FridgeType, DoorSection[]>> = {
  [FridgeType.SIDE_BY_SIDE]: [
    {
      label: '냉동실',
      positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      layout: 'twoColumn',
      columnSplit: 6,
      isFreezer: true,
    },
    {
      label: '냉장실',
      positions: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      layout: 'twoColumn',
      columnSplit: 6,
    },
  ],
  [FridgeType.FOUR_DOOR]: [
    { label: '좌측', positions: [0, 1, 2, 3, 4, 5], layout: 'twoColumn', columnSplit: 3 },
    { label: '우측', positions: [6, 7, 8, 9, 10, 11], layout: 'twoColumn', columnSplit: 3 },
    { label: '하단 1', positions: [12], layout: 'grid2x1', spanFull: true },
    { label: '하단 2', positions: [13], layout: 'grid2x1', spanFull: true },
  ],
}

// 서랍 위치 (높이를 낮게 표시)
export const isDrawerPosition = (fridgeType: FridgeType, position: number): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) return [10, 11, 16, 17].includes(position)
  return false
}

// 쇼케이스 위치 (별도 스타일)
export const isShowcasePosition = (fridgeType: FridgeType, position: number): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) return position >= 18
  return false
}

// 냉동 영역 판별
export const isFreezerZone = (
  fridgeType: FridgeType,
  position: number,
  compartmentType: CompartmentType,
): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) return position <= 10
  if (fridgeType === FridgeType.FOUR_DOOR) return false
  return compartmentType === CompartmentType.FREEZER
}

// === 기존 그리드 (ONE_DOOR, TWO_DOOR, MINI용) ===

export const SIMPLE_GRID_CLASS: Partial<Record<FridgeType, string>> = {
  [FridgeType.ONE_DOOR]: 'gridOneDoor',
  [FridgeType.TWO_DOOR]: 'gridTwoDoor',
  [FridgeType.MINI]: 'gridMini',
}

export const getCompartmentPositionClass = (
  fridgeType: FridgeType,
  position: number,
): string => {
  const map: Partial<Record<FridgeType, Record<number, string>>> = {
    [FridgeType.ONE_DOOR]: {
      0: 'oneDoorFridgeUpper',
      1: 'oneDoorFridgeLower',
      2: 'oneDoorFreezer',
      3: 'oneDoorDoor',
    },
    [FridgeType.TWO_DOOR]: {
      0: 'twoDoorFridgeUpper',
      1: 'twoDoorFridgeLower',
      2: 'twoDoorFreezer',
      3: 'twoDoorDoor',
      4: 'twoDoorDrawer',
      5: 'twoDoorVeggie',
    },
    [FridgeType.MINI]: {
      0: 'miniFridgeUpper',
      1: 'miniFreezer',
      2: 'miniDoor',
    },
  }
  return map[fridgeType]?.[position] ?? ''
}

// === 빈 슬롯 계산 ===

export const getEmptySlots = (
  fridgeType: FridgeType,
  compartments: CompartmentPreset[],
): CompartmentPreset[] => {
  const presets = COMPARTMENT_PRESETS[fridgeType]
  const occupiedPositions = new Set(compartments.map((c) => c.position))
  return presets.filter((p) => !occupiedPositions.has(p.position))
}
