import Phaser from 'phaser'
import type { MapId } from '@soulblade/shared'

/**
 * 환경 파티클 시스템
 * 맵별 테마 파티클 (먼지, 나뭇잎, 눈송이, 불씨)
 * Object Pool (최대 20개), 카메라 범위 밖 파티클 재활용
 * LOD full에서만 활성화 (enableEnvironmentParticles)
 */

interface ParticleConfig {
  readonly color: number
  readonly minSize: number
  readonly maxSize: number
  readonly alpha: number
  readonly driftX: number // 수평 이동 속도
  readonly driftY: number // 수직 이동 속도 (양수 = 아래로)
  readonly wobble: number // 좌우 흔들림 진폭
}

const MAP_PARTICLES: Record<MapId, ParticleConfig> = {
  town: {
    color: 0xccbb99,
    minSize: 1,
    maxSize: 2,
    alpha: 0.3,
    driftX: 0.2,
    driftY: 0.15,
    wobble: 0.3,
  },
  serpent_forest: {
    color: 0x44aa44,
    minSize: 2,
    maxSize: 3,
    alpha: 0.4,
    driftX: 0.3,
    driftY: 0.4,
    wobble: 0.5,
  },
  ice_cave: {
    color: 0xccddff,
    minSize: 1,
    maxSize: 2.5,
    alpha: 0.5,
    driftX: 0.1,
    driftY: 0.3,
    wobble: 0.4,
  },
  flame_castle: {
    color: 0xff6633,
    minSize: 1,
    maxSize: 2,
    alpha: 0.5,
    driftX: 0.15,
    driftY: -0.3,
    wobble: 0.2,
  },
}

const PARTICLE_DEPTH = 12
const MAX_PARTICLES = 20

interface PoolParticle {
  circle: Phaser.GameObjects.Arc
  vx: number
  vy: number
  wobbleOffset: number
  lifetime: number
  elapsed: number
}

export class EnvironmentParticlesSystem {
  private scene: Phaser.Scene
  private pool: PoolParticle[] = []
  private config: ParticleConfig | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  onMapLoad = (mapId: MapId): void => {
    this.onMapUnload()
    this.config = MAP_PARTICLES[mapId]
  }

  onMapUnload = (): void => {
    for (const p of this.pool) {
      p.circle.destroy()
    }
    this.pool = []
    this.config = null
  }

  update = (
    camera: Phaser.Cameras.Scene2D.Camera,
    enableEnvironmentParticles: boolean,
    delta: number,
  ): void => {
    if (!enableEnvironmentParticles || !this.config) {
      // 비활성 시 숨기기
      for (const p of this.pool) {
        p.circle.setVisible(false)
      }
      return
    }

    const dt = delta / 1000

    // 풀이 부족하면 새 파티클 생성
    if (this.pool.length < MAX_PARTICLES) {
      this.spawnParticle(camera)
    }

    // 파티클 업데이트
    for (const p of this.pool) {
      p.elapsed += delta
      p.circle.setVisible(true)

      // 이동: drift + wobble
      const wobble =
        Math.sin(p.elapsed * 0.003 + p.wobbleOffset) * this.config.wobble
      p.circle.x += (p.vx + wobble) * dt * 60
      p.circle.y += p.vy * dt * 60

      // 페이드: 수명 기반
      const lifeRatio = p.elapsed / p.lifetime
      if (lifeRatio > 0.7) {
        p.circle.setAlpha(this.config.alpha * (1 - (lifeRatio - 0.7) / 0.3))
      }

      // 수명 만료 또는 카메라 밖 → 재활용
      if (p.elapsed >= p.lifetime || this.isOutOfBounds(p.circle, camera)) {
        this.recycleParticle(p, camera)
      }
    }
  }

  private spawnParticle = (camera: Phaser.Cameras.Scene2D.Camera): void => {
    if (!this.config) return

    const size =
      this.config.minSize +
      Math.random() * (this.config.maxSize - this.config.minSize)
    const x = camera.scrollX + Math.random() * camera.width
    const y = camera.scrollY + Math.random() * camera.height

    const circle = this.scene.add.circle(
      x,
      y,
      size,
      this.config.color,
      this.config.alpha,
    )
    circle.setDepth(PARTICLE_DEPTH)

    this.pool.push({
      circle,
      vx: this.config.driftX * (0.5 + Math.random()),
      vy: this.config.driftY * (0.5 + Math.random()),
      wobbleOffset: Math.random() * Math.PI * 2,
      lifetime: 3000 + Math.random() * 4000,
      elapsed: 0,
    })
  }

  private recycleParticle = (
    p: PoolParticle,
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void => {
    if (!this.config) return

    // 카메라 가장자리에서 새로 시작
    p.circle.x = camera.scrollX + Math.random() * camera.width
    p.circle.y = camera.scrollY - 10 - Math.random() * 20
    p.circle.setAlpha(this.config.alpha)
    p.vx = this.config.driftX * (0.5 + Math.random())
    p.vy = this.config.driftY * (0.5 + Math.random())
    p.wobbleOffset = Math.random() * Math.PI * 2
    p.lifetime = 3000 + Math.random() * 4000
    p.elapsed = 0
  }

  private isOutOfBounds = (
    circle: Phaser.GameObjects.Arc,
    camera: Phaser.Cameras.Scene2D.Camera,
  ): boolean => {
    const margin = 50
    return (
      circle.x < camera.scrollX - margin ||
      circle.x > camera.scrollX + camera.width + margin ||
      circle.y < camera.scrollY - margin ||
      circle.y > camera.scrollY + camera.height + margin
    )
  }

  destroy = (): void => {
    this.onMapUnload()
  }
}
