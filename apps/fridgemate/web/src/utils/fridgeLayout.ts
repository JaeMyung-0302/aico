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
  reverseColumns?: boolean
}

export const DOOR_SECTIONS: Partial<Record<FridgeType, DoorSection[]>> = {
  [FridgeType.TWO_DOOR]: [
    {
      label: '냉장실',
      positions: [0, 1, 2, 3, 4, 5],
      layout: 'twoColumn',
      columnSplit: 3,
    },
    {
      label: '냉동실',
      positions: [6, 7, 8],
      layout: 'column',
      isFreezer: true,
    },
  ],
  [FridgeType.SIDE_BY_SIDE]: [
    {
      label: '냉동실',
      positions: [15, 16, 17, 18, 19, 10, 11, 12, 13, 14],
      layout: 'twoColumn',
      columnSplit: 5,
      isFreezer: true,
      reverseColumns: true,
    },
    {
      label: '냉장실',
      positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      layout: 'twoColumn',
      columnSplit: 5,
    },
  ],
  [FridgeType.FOUR_DOOR]: [
    {
      label: '좌측',
      positions: [0, 1, 2, 3, 4, 5],
      layout: 'twoColumn',
      columnSplit: 3,
    },
    {
      label: '우측',
      positions: [6, 7, 8, 9, 10, 11],
      layout: 'twoColumn',
      columnSplit: 3,
    },
    { label: '하단 1', positions: [12], layout: 'grid2x1', spanFull: true },
    { label: '하단 2', positions: [13], layout: 'grid2x1', spanFull: true },
  ],
}

// 서랍 위치 (높이를 낮게 표시)
export const isDrawerPosition = (
  _fridgeType: FridgeType,
  _position: number,
): boolean => {
  return false
}

// 쇼케이스 위치 (별도 스타일)
export const isShowcasePosition = (
  _fridgeType: FridgeType,
  _position: number,
): boolean => {
  return false
}

// 냉동 영역 판별
export const isFreezerZone = (
  fridgeType: FridgeType,
  position: number,
  compartmentType: CompartmentType,
): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) {
    if (compartmentType === CompartmentType.FREEZER) return true
    // 냉동실 문 수납 (preset positions 15-19)
    if (position >= 10 && position <= 19) return true
    // extra 냉동실 (column 2 = odd position)
    if (position >= EXTRA_BASE_OFFSET) return position % 2 !== 0
    return false
  }
  if (fridgeType === FridgeType.FOUR_DOOR) return false
  return compartmentType === CompartmentType.FREEZER
}

// === 기존 그리드 (ONE_DOOR용) ===

export const SIMPLE_GRID_CLASS: Partial<Record<FridgeType, string>> = {
  [FridgeType.ONE_DOOR]: 'gridOneDoor',
}

export const getCompartmentPositionClass = (
  fridgeType: FridgeType,
  position: number,
): string => {
  const map: Partial<Record<FridgeType, Record<number, string>>> = {
    [FridgeType.ONE_DOOR]: {
      0: 'oneDoorFridge1',
      1: 'oneDoorFridge2',
      2: 'oneDoorDoor1',
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

// === 추가 칸 유틸리티 ===

export const getPresetPositions = (fridgeType: FridgeType): Set<number> =>
  new Set(COMPARTMENT_PRESETS[fridgeType].map((p) => p.position))

export const getNextPosition = (
  compartments: { position: number }[],
): number => {
  if (compartments.length === 0) return 0
  return Math.max(...compartments.map((c) => c.position)) + 1
}

export const getExtraCompartments = <T extends { position: number }>(
  fridgeType: FridgeType,
  compartments: T[],
): T[] => {
  const presetPositions = getPresetPositions(fridgeType)
  return compartments.filter((c) => !presetPositions.has(c.position))
}

// === 추가 칸 위치 인코딩 (본체/도어 column 구분) ===

export const EXTRA_BASE_OFFSET = 100

// position 인코딩: BASE_OFFSET + 순번*2 + (column-1)
// even(짝수) = 본체(column 1), odd(홀수) = 도어(column 2)
export const encodeExtraPosition = (
  compartments: { position: number }[],
  column: 1 | 2,
): number => {
  const existingPositions = new Set(
    compartments.map((c) => c.position).filter((p) => p >= EXTRA_BASE_OFFSET),
  )
  let seq = 0
  while (existingPositions.has(EXTRA_BASE_OFFSET + seq * 2 + (column - 1))) {
    seq++
  }
  return EXTRA_BASE_OFFSET + seq * 2 + (column - 1)
}

export const isEncodedExtraPosition = (position: number): boolean =>
  position >= EXTRA_BASE_OFFSET

export const decodeExtraColumn = (position: number): 1 | 2 =>
  position % 2 === 0 ? 1 : 2

export const getExtraColumnClass = (position: number): string | undefined => {
  if (!isEncodedExtraPosition(position)) return undefined
  return decodeExtraColumn(position) === 1 ? 'extraInBody' : 'extraInDoor'
}
