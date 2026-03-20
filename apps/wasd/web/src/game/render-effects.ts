import type { Particle, EffectsState, ScreenShake } from './types'

const MAX_PARTICLES = 50

export const createEffectsState = (): EffectsState => ({
  particles: [],
  shake: null,
})

// --- Particle management ---

const createParticle = (
  x: number,
  y: number,
  color: string,
  speed: number = 1,
): Particle => {
  const angle = Math.random() * Math.PI * 2
  const velocity = (1 + Math.random() * 2) * speed
  return {
    x,
    y,
    vx: Math.cos(angle) * velocity,
    vy: Math.sin(angle) * velocity,
    life: 1,
    maxLife: 0.5 + Math.random() * 0.5,
    color,
    size: 1.5 + Math.random() * 2.5,
  }
}

const pickColor = (colors: string[]): string =>
  colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!

const appendParticles = (
  state: EffectsState,
  newParticles: Particle[],
): EffectsState => ({
  ...state,
  particles: [...state.particles, ...newParticles].slice(-MAX_PARTICLES),
})

export const emitDeathParticles = (
  state: EffectsState,
  x: number,
  y: number,
): EffectsState => {
  const colors = ['#ff4444', '#ff6666', '#cc2222', '#ff8888']
  const particles = Array.from({ length: 12 }, () =>
    createParticle(x, y, pickColor(colors), 2),
  )
  return appendParticles(state, particles)
}

export const emitStageClearParticles = (
  state: EffectsState,
  canvasWidth: number,
  canvasHeight: number,
): EffectsState => {
  const colors = ['#ffd700', '#00d4ff', '#7ec850', '#ff6b35', '#b44dff']
  const particles = Array.from({ length: 20 }, () => {
    const base = createParticle(
      Math.random() * canvasWidth,
      canvasHeight + 10,
      pickColor(colors),
      2,
    )
    return {
      ...base,
      vy: -(3 + Math.random() * 4),
      vx: (Math.random() - 0.5) * 3,
      maxLife: 1 + Math.random(),
    }
  })
  return appendParticles(state, particles)
}

// --- Screen shake ---

export const triggerScreenShake = (
  state: EffectsState,
  intensity: number = 4,
  duration: number = 150,
): EffectsState => ({
  ...state,
  shake: { intensity, duration, startTime: performance.now() },
})

const getShakeOffset = (
  shake: ScreenShake | null,
): { x: number; y: number } => {
  if (!shake) return { x: 0, y: 0 }

  const elapsed = performance.now() - shake.startTime
  if (elapsed >= shake.duration) return { x: 0, y: 0 }

  const progress = elapsed / shake.duration
  const dampening = 1 - progress
  const intensity = shake.intensity * dampening

  return {
    x: (Math.random() - 0.5) * 2 * intensity,
    y: (Math.random() - 0.5) * 2 * intensity,
  }
}

// --- Update & Render ---

export const updateEffects = (
  state: EffectsState,
  dt: number,
): EffectsState => {
  // Update particles
  const particles = state.particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.1, // gravity
      life: p.life - dt / p.maxLife,
      size: p.size * (0.97 + 0.03 * p.life),
    }))
    .filter((p) => p.life > 0)

  // Clean expired shake
  const shake =
    state.shake &&
    performance.now() - state.shake.startTime < state.shake.duration
      ? state.shake
      : null

  return { particles, shake }
}

export const renderEffects = (
  ctx: CanvasRenderingContext2D,
  state: EffectsState,
) => {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export const applyShakeTransform = (
  ctx: CanvasRenderingContext2D,
  shake: ScreenShake | null,
): void => {
  const offset = getShakeOffset(shake)
  if (offset.x !== 0 || offset.y !== 0) {
    ctx.translate(offset.x, offset.y)
  }
}
