export const MinigameType = {
  TimingClick: 'TimingClick',
  PatternMemory: 'PatternMemory',
  MashChallenge: 'MashChallenge',
  ReactionTest: 'ReactionTest',
  Quiz: 'Quiz',
  RhythmGame: 'RhythmGame',
} as const

export type MinigameType = (typeof MinigameType)[keyof typeof MinigameType]

export const MiniGameGrade = {
  S: 'S',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
} as const

export type MiniGameGrade = (typeof MiniGameGrade)[keyof typeof MiniGameGrade]

export const DungeonDifficulty = {
  Easy: 'Easy',
  Normal: 'Normal',
  Hard: 'Hard',
  Hell: 'Hell',
} as const

export type DungeonDifficulty =
  (typeof DungeonDifficulty)[keyof typeof DungeonDifficulty]

export const EnergyActivity = {
  Minigame: 'Minigame',
  Dungeon: 'Dungeon',
  PvP: 'PvP',
  Boss: 'Boss',
  Summon: 'Summon',
  Fusion: 'Fusion',
  Stage: 'Stage',
} as const

export type EnergyActivity =
  (typeof EnergyActivity)[keyof typeof EnergyActivity]

export interface GradeResult {
  grade: MiniGameGrade
  score: number
  statIncrease: number
  statType: string
}

export interface BattleTurnLog {
  turn: number
  attacker: 'player' | 'enemy'
  damage: number
  playerHp: number
  enemyHp: number
  isCritical: boolean
  skillName?: string
  skillElement?: string
  skillCategory?: 'physical' | 'magical'
}

export interface BattleResult {
  winner: 'player' | 'enemy'
  turns: BattleTurnLog[]
  goldReward: number
}

// 팀 전투 애니메이션 페이즈
export type TeamBattlePhase =
  | 'idle'
  | 'round_intro'
  | 'attack'
  | 'hit'
  | 'damage'
  | 'wait'
  | 'round_end'
  | 'round_transition'
  | 'battle_end'

// 진화 결과
export interface EvolutionResult {
  success: boolean
  monsterId: string
  fromSpeciesId: string
  toSpeciesId: string
  toSpeciesName: string
  newImageUrl: string | null
  goldSpent: number
}

// 합성 결과
export interface FusionResult {
  success: boolean
  parent1Id: string
  parent2Id: string
  newMonsterId: string
  resultSpeciesId: string
  resultSpeciesName: string
  resultRarity: string // Rarity enum value
  newImageUrl: string | null
  goldSpent: number
}
