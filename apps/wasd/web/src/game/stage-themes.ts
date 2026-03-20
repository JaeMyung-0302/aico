import type { StageTheme, StageName } from './types'

const SHARED_OBSTACLE = {
  obstacle: '#ff6b6b',
  obstacleBorder: '#cc5555',
  obstacleLarge: '#b44dff',
  obstacleLargeBorder: '#8a2be2',
}

const DANGER_OBSTACLE = {
  obstacle: '#ff4444',
  obstacleBorder: '#cc3333',
  obstacleLarge: '#ff2222',
  obstacleLargeBorder: '#cc1111',
}

const theme = (
  name: StageName,
  colors: Omit<StageTheme, 'name' | 'coin' | 'obstacle' | 'obstacleBorder' | 'obstacleLarge' | 'obstacleLargeBorder'>,
  obs = SHARED_OBSTACLE,
): StageTheme => ({ name, coin: '#ffd700', ...colors, ...obs })

export const STAGE_THEMES: readonly StageTheme[] = [
  theme('Forest', {
    background: '#0f1f0f', floor: '#1a2e1a', wall: '#3a5a3a', wallBorder: '#2a4a2a',
    accent: '#7ec850', start: '#7ec850', goal: '#50c878',
  }),
  theme('Cave', {
    background: '#0a0a1e', floor: '#1a1a2e', wall: '#4a4a6a', wallBorder: '#3a3a5a',
    accent: '#6ea8d7', start: '#6ea8d7', goal: '#4a90d9',
  }),
  theme('Volcano', {
    background: '#1e0a0a', floor: '#2e1a1a', wall: '#6a3a3a', wallBorder: '#5a2a2a',
    accent: '#ff6b35', start: '#ff6b35', goal: '#ff4500',
  }, DANGER_OBSTACLE),
  theme('Desert', {
    background: '#1e1a0a', floor: '#2e2a1a', wall: '#6a5a3a', wallBorder: '#5a4a2a',
    accent: '#f0c040', start: '#f0c040', goal: '#daa520',
  }),
  theme('Abyss', {
    background: '#080810', floor: '#0f0f1a', wall: '#3a2a5a', wallBorder: '#2a1a4a',
    accent: '#b44dff', start: '#b44dff', goal: '#9932cc',
  }, DANGER_OBSTACLE),
]

export const getStageTheme = (stage: number): StageTheme =>
  STAGE_THEMES[stage - 1] ?? STAGE_THEMES[1]!
