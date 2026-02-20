export type StageName = 'Forest' | 'Cave' | 'Volcano' | 'Desert' | 'Abyss'

export interface StageTheme {
  name: StageName
  background: string
  floor: string
  wall: string
  wallBorder: string
  accent: string
  coin: string
  start: string
  goal: string
  obstacle: string
  obstacleBorder: string
  obstacleLarge: string
  obstacleLargeBorder: string
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface ScreenShake {
  intensity: number
  duration: number
  startTime: number
}

export interface EffectsState {
  particles: Particle[]
  shake: ScreenShake | null
}
