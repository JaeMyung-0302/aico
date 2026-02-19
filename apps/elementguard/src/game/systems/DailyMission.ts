// 일일 미션 시스템: 3가지 미션 타입, 매일 갱신

const STORAGE_KEY = 'eg_daily_missions'
const MISSION_REWARD_GEL = 5

interface MissionDefinition {
  id: string
  type: 'play_games' | 'reach_wave' | 'collect_artifacts'
  description: string
  target: number
}

interface MissionProgress {
  missionId: string
  current: number
  completed: boolean
  claimed: boolean
}

interface DailyMissionState {
  date: string // YYYY-MM-DD
  missions: MissionProgress[]
}

// 미션 풀 (매일 3개 랜덤 선택)
const MISSION_POOL: MissionDefinition[] = [
  { id: 'play_1', type: 'play_games', description: '게임 1회 플레이', target: 1 },
  { id: 'play_3', type: 'play_games', description: '게임 3회 플레이', target: 3 },
  { id: 'wave_10', type: 'reach_wave', description: 'Wave 10 도달', target: 10 },
  { id: 'wave_20', type: 'reach_wave', description: 'Wave 20 도달', target: 20 },
  { id: 'artifact_3', type: 'collect_artifacts', description: '유물 3개 수집', target: 3 },
  { id: 'artifact_5', type: 'collect_artifacts', description: '유물 5개 수집', target: 5 },
]

const getToday = (): string => new Date().toISOString().split('T')[0] ?? ''

// 날짜 기반 시드로 일관된 미션 3개 선택
const selectDailyMissions = (dateStr: string): MissionDefinition[] => {
  let seed = 0
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed << 5) - seed + dateStr.charCodeAt(i)) | 0
  }

  const shuffled = [...MISSION_POOL]
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647
    const j = Math.abs(seed) % (i + 1)
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }

  // 타입 중복 방지: 각 타입에서 최대 1개씩
  const selected: MissionDefinition[] = []
  const usedTypes = new Set<string>()

  for (const mission of shuffled) {
    if (selected.length >= 3) break
    if (usedTypes.has(mission.type)) continue
    usedTypes.add(mission.type)
    selected.push(mission)
  }

  return selected
}

const loadState = (): DailyMissionState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const s = parsed as Record<string, unknown>
    if (typeof s.date !== 'string' || !Array.isArray(s.missions)) return null
    return parsed as DailyMissionState
  } catch {
    return null
  }
}

const saveState = (state: DailyMissionState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const DailyMissionManager = {
  // 오늘의 미션 가져오기 (없으면 생성)
  getMissions: (): { definition: MissionDefinition; progress: MissionProgress }[] => {
    const today = getToday()
    let state = loadState()

    // 날짜가 다르면 새 미션 생성
    if (!state || state.date !== today) {
      const missions = selectDailyMissions(today)
      state = {
        date: today,
        missions: missions.map((m) => ({
          missionId: m.id,
          current: 0,
          completed: false,
          claimed: false,
        })),
      }
      saveState(state)
    }

    const todayMissions = selectDailyMissions(today)
    return state.missions
      .map((progress) => {
        const definition = todayMissions.find((m) => m.id === progress.missionId)
        if (!definition) return null
        return { definition, progress }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  },

  // 미션 진행도 업데이트
  updateProgress: (type: MissionDefinition['type'], value: number) => {
    const today = getToday()
    const state = loadState()
    if (!state || state.date !== today) return

    const todayMissions = selectDailyMissions(today)
    const updatedMissions = state.missions.map((progress) => {
      if (progress.completed) return progress
      const def = todayMissions.find((m) => m.id === progress.missionId)
      if (!def || def.type !== type) return progress

      const newCurrent = type === 'play_games'
        ? progress.current + value
        : Math.max(progress.current, value)

      return {
        ...progress,
        current: newCurrent,
        completed: newCurrent >= def.target,
      }
    })

    saveState({ ...state, missions: updatedMissions })
  },

  // 보상 수령
  claimReward: (missionId: string): number => {
    const today = getToday()
    const state = loadState()
    if (!state || state.date !== today) return 0

    const mission = state.missions.find((m) => m.missionId === missionId)
    if (!mission || !mission.completed || mission.claimed) return 0

    const updatedMissions = state.missions.map((m) =>
      m.missionId === missionId ? { ...m, claimed: true } : m,
    )
    saveState({ ...state, missions: updatedMissions })

    return MISSION_REWARD_GEL
  },

  getRewardAmount: (): number => MISSION_REWARD_GEL,
}
