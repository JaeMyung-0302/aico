import { apiFetch } from '@/lib/api-client'

// === Profile ===

interface ProfileRow {
  id: string
  display_name: string
  gel: number
  exp: number
  level: number
  total_games: number
  best_score: number
  is_guest: boolean
}

export const getProfile = async (): Promise<ProfileRow | null> => {
  try {
    return await apiFetch<ProfileRow>('/profiles/me')
  } catch {
    return null
  }
}

export const upsertProfile = async (profile: { display_name: string }): Promise<boolean> => {
  try {
    await apiFetch('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(profile),
    })
    return true
  } catch {
    return false
  }
}

// === Growth Tree ===

interface GrowthRow {
  user_id: string
  attack_level: number
  defense_level: number
  economy_level: number
  luck_level: number
  total_invested: number
}

export const getGrowthTree = async (): Promise<GrowthRow | null> => {
  try {
    return await apiFetch<GrowthRow>('/growth/me')
  } catch {
    return null
  }
}

export const upsertGrowthTree = async (growth: Omit<GrowthRow, 'user_id'>): Promise<boolean> => {
  try {
    await apiFetch('/growth/me', {
      method: 'PUT',
      body: JSON.stringify(growth),
    })
    return true
  } catch {
    return false
  }
}

// === Game Runs ===

interface GameRunInsert {
  wave: number
  score: number
  is_clear: boolean
  artifacts: string[]
  duration_seconds: number
}

export const saveGameRun = async (run: GameRunInsert): Promise<boolean> => {
  try {
    await apiFetch('/game-runs', {
      method: 'POST',
      body: JSON.stringify(run),
    })
    return true
  } catch {
    return false
  }
}

export const getGameRuns = async (limit = 10): Promise<GameRunInsert[]> => {
  try {
    return await apiFetch<GameRunInsert[]>(`/game-runs?limit=${limit}`)
  } catch {
    return []
  }
}

// === Archive ===

interface ArchiveItem {
  item_type: 'unit' | 'fusion' | 'artifact'
  item_id: string
}

export const getArchive = async (): Promise<ArchiveItem[]> => {
  try {
    return await apiFetch<ArchiveItem[]>('/archive')
  } catch {
    return []
  }
}

export const addArchiveItem = async (item: ArchiveItem): Promise<boolean> => {
  try {
    await apiFetch('/archive', {
      method: 'POST',
      body: JSON.stringify(item),
    })
    return true
  } catch {
    return false
  }
}

// === Leaderboard ===

interface LeaderboardEntry {
  user_id: string
  display_name: string
  score: number
  wave: number
}

export const getWeeklyLeaderboard = async (limit = 10): Promise<LeaderboardEntry[]> => {
  try {
    return await apiFetch<LeaderboardEntry[]>(`/leaderboard/weekly?limit=${limit}`)
  } catch {
    return []
  }
}

export const submitLeaderboardEntry = async (entry: { score: number; wave: number }): Promise<boolean> => {
  try {
    await apiFetch('/leaderboard', {
      method: 'POST',
      body: JSON.stringify(entry),
    })
    return true
  } catch {
    return false
  }
}
