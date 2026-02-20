import type { StageTheme } from './types'

// Stage 1: Tutorial (숲) — 밝고 안전한 숲
const FOREST: StageTheme = {
  name: 'Forest',
  background: '#0f1f0f',
  floor: '#1a2e1a',
  wall: '#3a5a3a',
  wallBorder: '#2a4a2a',
  accent: '#7ec850',
  coin: '#ffd700',
  start: '#7ec850',
  goal: '#50c878',
  obstacle: '#ff6b6b',
  obstacleBorder: '#cc5555',
  obstacleLarge: '#b44dff',
  obstacleLargeBorder: '#8a2be2',
}

// Stage 2: Intermediate (동굴) — 서늘한 동굴
const CAVE: StageTheme = {
  name: 'Cave',
  background: '#0a0a1e',
  floor: '#1a1a2e',
  wall: '#4a4a6a',
  wallBorder: '#3a3a5a',
  accent: '#6ea8d7',
  coin: '#ffd700',
  start: '#6ea8d7',
  goal: '#4a90d9',
  obstacle: '#ff6b6b',
  obstacleBorder: '#cc5555',
  obstacleLarge: '#b44dff',
  obstacleLargeBorder: '#8a2be2',
}

// Stage 3: Hard (화산) — 뜨거운 화산
const VOLCANO: StageTheme = {
  name: 'Volcano',
  background: '#1e0a0a',
  floor: '#2e1a1a',
  wall: '#6a3a3a',
  wallBorder: '#5a2a2a',
  accent: '#ff6b35',
  coin: '#ffd700',
  start: '#ff6b35',
  goal: '#ff4500',
  obstacle: '#ff4444',
  obstacleBorder: '#cc3333',
  obstacleLarge: '#ff2222',
  obstacleLargeBorder: '#cc1111',
}

// Stage 4: Expert (사막) — 건조한 사막
const DESERT: StageTheme = {
  name: 'Desert',
  background: '#1e1a0a',
  floor: '#2e2a1a',
  wall: '#6a5a3a',
  wallBorder: '#5a4a2a',
  accent: '#f0c040',
  coin: '#ffd700',
  start: '#f0c040',
  goal: '#daa520',
  obstacle: '#ff6b6b',
  obstacleBorder: '#cc5555',
  obstacleLarge: '#b44dff',
  obstacleLargeBorder: '#8a2be2',
}

// Stage 5: Master (심연) — 어둡고 위험한 심연
const ABYSS: StageTheme = {
  name: 'Abyss',
  background: '#080810',
  floor: '#0f0f1a',
  wall: '#3a2a5a',
  wallBorder: '#2a1a4a',
  accent: '#b44dff',
  coin: '#ffd700',
  start: '#b44dff',
  goal: '#9932cc',
  obstacle: '#ff4444',
  obstacleBorder: '#cc3333',
  obstacleLarge: '#ff2222',
  obstacleLargeBorder: '#cc1111',
}

export const STAGE_THEMES: readonly StageTheme[] = [
  FOREST,
  CAVE,
  VOLCANO,
  DESERT,
  ABYSS,
]

export const getStageTheme = (stage: number): StageTheme =>
  STAGE_THEMES[stage - 1] ?? CAVE
