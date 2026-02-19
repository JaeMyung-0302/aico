export interface ProfileRow {
  id: string
  display_name: string
  gel: number
  exp: number
  level: number
  total_games: number
  best_score: number
  is_guest: boolean
}

export interface GrowthRow {
  user_id: string
  attack_level: number
  defense_level: number
  economy_level: number
  luck_level: number
  total_invested: number
}

export interface GameRunInsert {
  user_id: string
  wave: number
  score: number
  is_clear: boolean
  artifacts: string[]
  duration_seconds: number
}

export interface ArchiveItem {
  item_type: 'unit' | 'fusion' | 'artifact'
  item_id: string
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  score: number
  wave: number
}
