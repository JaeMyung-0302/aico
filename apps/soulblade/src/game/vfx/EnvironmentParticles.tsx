/**
 * 환경 파티클 시스템
 * 맵별 분위기 파티클 (먼지/나뭇잎/눈/불씨)
 *
 * Three.js Points + BufferGeometry 오브젝트 풀
 * 카메라 뷰포트 기준 스폰/리사이클
 * LOD: full → 활성, reduced 이하 → 비활성
 */

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color } from 'three'
import type { Points } from 'three'
import type { MapId } from '@soulblade/shared'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '@soulblade/shared'

// 파티클 풀 설정
const MAX_PARTICLES = 100
const PARTICLE_Y = 12
const RESPAWN_MARGIN = 50 // 화면 밖 마진

// 맵별 파티클 설정
const PARTICLE_THEMES: Record<MapId, {
  color: number
  minSize: number
  maxSize: number
  alpha: number
  driftX: number
  driftY: number // 양수=아래, 음수=위
  wobble: number
  minLifetime: number
  maxLifetime: number
}> = {
  town: {
    color: 0xddcc88, minSize: 2, maxSize: 3.5,
    alpha: 0.4, driftX: 0.2, driftY: 0.15, wobble: 0.3,
    minLifetime: 3000, maxLifetime: 7000,
  },
  serpent_forest: {
    color: 0x44aa44, minSize: 2, maxSize: 3,
    alpha: 0.4, driftX: 0.3, driftY: 0.4, wobble: 0.5,
    minLifetime: 3000, maxLifetime: 6000,
  },
  ice_cave: {
    color: 0xccddff, minSize: 1, maxSize: 2.5,
    alpha: 0.5, driftX: 0.1, driftY: 0.3, wobble: 0.4,
    minLifetime: 4000, maxLifetime: 8000,
  },
  flame_castle: {
    color: 0xff6633, minSize: 1, maxSize: 2,
    alpha: 0.5, driftX: 0.15, driftY: -0.3, wobble: 0.2,
    minLifetime: 2000, maxLifetime: 5000,
  },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  lifetime: number
  wobbleOffset: number
  size: number
  active: boolean
}

interface EnvironmentParticlesProps {
  mapId: MapId
  enabled: boolean
}

// 파티클 풀 생성 (useRef 초기값으로 즉시 할당 — useFrame이 useEffect보다 먼저 실행되므로)
const createParticlePool = (): Particle[] =>
  Array.from({ length: MAX_PARTICLES }, () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    age: 0, lifetime: 0, wobbleOffset: 0, size: 0,
    active: false,
  }))

export const EnvironmentParticles = ({ mapId, enabled }: EnvironmentParticlesProps) => {
  const pointsRef = useRef<Points>(null)
  const particles = useRef<Particle[]>(createParticlePool())
  const elapsedRef = useRef(0)
  const { camera } = useThree()
  const theme = PARTICLE_THEMES[mapId]

  const particleColor = useMemo(() => new Color(theme.color), [theme.color])

  // 뷰포트 영역 내 파티클 스폰
  const spawnParticle = (p: Particle) => {
    const camX = camera.position.x
    const camZ = camera.position.z
    const halfW = VIEWPORT_WIDTH / 2 + RESPAWN_MARGIN
    const halfH = VIEWPORT_HEIGHT / 2 + RESPAWN_MARGIN

    p.x = camX + (Math.random() - 0.5) * halfW * 2
    p.y = camZ + (Math.random() - 0.5) * halfH * 2
    p.vx = theme.driftX * (0.5 + Math.random())
    p.vy = theme.driftY * (0.5 + Math.random())
    p.age = 0
    p.lifetime = theme.minLifetime + Math.random() * (theme.maxLifetime - theme.minLifetime)
    p.wobbleOffset = Math.random() * Math.PI * 2
    p.size = theme.minSize + Math.random() * (theme.maxSize - theme.minSize)
    p.active = true
  }

  useFrame((_state, delta) => {
    if (!enabled || !pointsRef.current) return

    const dt = Math.min(delta * 1000, 50)
    elapsedRef.current += dt
    const elapsed = elapsedRef.current
    const camX = camera.position.x
    const camZ = camera.position.z
    const halfW = VIEWPORT_WIDTH / 2 + RESPAWN_MARGIN
    const halfH = VIEWPORT_HEIGHT / 2 + RESPAWN_MARGIN

    const positions = pointsRef.current.geometry.getAttribute('position')
    const colors = pointsRef.current.geometry.getAttribute('color')
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles.current[i]!

      if (!p.active) {
        // 비활성 → 스폰
        spawnParticle(p)
      }

      // 위치 업데이트
      p.age += dt
      const wobble = Math.sin(elapsed * 0.003 + p.wobbleOffset) * theme.wobble
      p.x += (p.vx + wobble) * delta * 30
      p.y += p.vy * delta * 30

      // 수명 초과 또는 화면 밖 → 리사이클
      if (p.age >= p.lifetime || Math.abs(p.x - camX) > halfW || Math.abs(p.y - camZ) > halfH) {
        spawnParticle(p)
      }

      // 페이드아웃 (수명 70% 이후)
      const fadeStart = p.lifetime * 0.7
      const alpha = p.age > fadeStart
        ? theme.alpha * (1 - (p.age - fadeStart) / (p.lifetime - fadeStart))
        : theme.alpha

      positions.setXYZ(i, p.x, PARTICLE_Y, p.y)
      colors.setXYZ(i, particleColor.r * alpha, particleColor.g * alpha, particleColor.b * alpha)
    }

    positions.needsUpdate = true
    colors.needsUpdate = true
  })

  if (!enabled) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(MAX_PARTICLES * 3), 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[new Float32Array(MAX_PARTICLES * 3), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        size={8}
      />
    </points>
  )
}
