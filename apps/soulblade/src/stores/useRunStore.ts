import { create } from 'zustand'
import type { CharacterClass, CharacterStats, Equipment, MapId } from '@soulblade/shared'
import type { StageId } from '@soulblade/shared'
import type { PassiveSkillId } from '@soulblade/shared'

interface PendingStart {
  readonly mapId: MapId
  readonly classType: CharacterClass
  readonly stats: CharacterStats
  readonly equippedItems: readonly Equipment[]
  readonly characterName?: string
}

interface ActiveSkillState {
  readonly id: PassiveSkillId
  readonly level: number
}

interface RunState {
  // 런 설정
  readonly stageId: StageId | null
  readonly classType: CharacterClass | null
  readonly isRunning: boolean

  // 플레이어 상태
  readonly playerHp: number
  readonly playerMaxHp: number
  readonly playerLevel: number
  readonly playerExp: number
  readonly playerExpToNext: number

  // In-Run 스킬
  readonly skills: readonly ActiveSkillState[]

  // 통계
  readonly killCount: number
  readonly survivedSeconds: number
  readonly score: number

  // 게임 시작 대기 데이터 (LobbyPage → GameCanvas 전달용)
  readonly pendingStart: PendingStart | null
  readonly setPendingStart: (data: PendingStart) => void
  readonly clearPendingStart: () => void

  // 액션
  readonly startRun: (stageId: StageId, classType: CharacterClass) => void
  readonly endRun: () => void
  readonly updatePlayerStats: (stats: {
    hp: number
    maxHp: number
    level: number
    exp: number
    expToNext: number
  }) => void
  readonly addSkill: (skillId: PassiveSkillId, level: number) => void
  readonly updateKillCount: (count: number) => void
  readonly updateTimer: (seconds: number) => void
}

export const useRunStore = create<RunState>((set) => ({
  stageId: null,
  classType: null,
  isRunning: false,
  playerHp: 0,
  playerMaxHp: 0,
  playerLevel: 1,
  playerExp: 0,
  playerExpToNext: 100,
  skills: [],
  killCount: 0,
  survivedSeconds: 0,
  score: 0,
  pendingStart: null,

  setPendingStart: (data) => set({ pendingStart: data }),
  clearPendingStart: () => set({ pendingStart: null }),

  startRun: (stageId, classType) => {
    set({
      stageId,
      classType,
      isRunning: true,
      playerLevel: 1,
      playerExp: 0,
      skills: [],
      killCount: 0,
      survivedSeconds: 0,
      score: 0,
    })
  },

  endRun: () => {
    set({ isRunning: false })
  },

  updatePlayerStats: (stats) => {
    set({
      playerHp: stats.hp,
      playerMaxHp: stats.maxHp,
      playerLevel: stats.level,
      playerExp: stats.exp,
      playerExpToNext: stats.expToNext,
    })
  },

  addSkill: (skillId, level) => {
    set((state) => {
      const existing = state.skills.findIndex((s) => s.id === skillId)
      if (existing >= 0) {
        const updated = state.skills.map((s, i) =>
          i === existing ? { ...s, level } : s,
        )
        return { skills: updated }
      }
      return { skills: [...state.skills, { id: skillId, level }] }
    })
  },

  updateKillCount: (count) => set({ killCount: count }),
  updateTimer: (seconds) => set({ survivedSeconds: seconds }),
}))
