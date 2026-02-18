export interface UserProfile {
  id: string
  supabaseId: string
  nickname: string | null
  gold: number
  summonStones: number
  maxMonsters: number
  pityCounter: number
  tutorialCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface EnergyState {
  remaining: number
  max: number
  nextResetAt: string
}
