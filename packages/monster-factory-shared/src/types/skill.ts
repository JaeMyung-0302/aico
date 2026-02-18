import type { Element } from './monster.js'

export const SkillCategory = {
  Physical: 'physical',
  Magical: 'magical',
} as const

export type SkillCategory = (typeof SkillCategory)[keyof typeof SkillCategory]

export interface Skill {
  id: string
  name: string
  element: Element
  category: SkillCategory
  power: number // 스킬 위력 배율 (일반 공격=1.0, 스킬=1.2~3.0)
  accuracy: number // 명중률 (1.0 = 100%)
  cooldown: number // 턴 쿨다운 (0 = 매턴 사용)
  description: string | null
}
