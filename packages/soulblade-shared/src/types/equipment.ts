import type { CharacterStats } from './character.js'

// 장비 슬롯 타입
export type EquipmentType = 'weapon' | 'armor' | 'accessory'

// 장비 등급 (5단계)
export type EquipmentGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// 장비 태그 (6종 시너지)
export type EquipmentTag = 'fire' | 'ice' | 'vampire' | 'thunder' | 'holy' | 'poison'

// 장비 데이터
export interface Equipment {
  readonly id: string
  readonly userId: string
  readonly type: EquipmentType
  readonly grade: EquipmentGrade
  readonly name: string
  readonly tags: readonly EquipmentTag[]
  readonly stats: Partial<CharacterStats>
  readonly equippedBy: string | null // character id
}

// 태그 시너지 보너스
export interface SynergyBonus {
  readonly tag: EquipmentTag
  readonly count: number // 현재 장착된 해당 태그 수
  readonly bonus: Partial<CharacterStats>
  readonly active: boolean
}

// 시너지 설정 (3개 세트 / 4개 세트)
export interface TagSynergyConfig {
  readonly tag: EquipmentTag
  readonly threeSetBonus: Partial<CharacterStats>
  readonly fourSetBonus: Partial<CharacterStats>
}

// 장비 등급별 스탯 범위
export interface GradeStatRange {
  readonly min: number
  readonly max: number
}
