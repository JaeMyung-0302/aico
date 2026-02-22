/**
 * 전투 히트/사망 이펙트
 * eventBus 이벤트 리슨 → 파티클 + 충격파 렌더
 *
 * - combat:damageNumber → 히트 스파크 (크리티컬: 금색 플래시)
 * - monster:death → 사망 충격파 + 잔류 글로우
 *
 * Three.js Points + BufferGeometry 파티클
 * LOD: enhanced(full/reduced) | basic(minimal) | none(canvas)
 */

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, Color } from 'three'
import type { CombatEffectLevel } from '../systems/combat'
import { eventBus } from '@/lib/event-bus'

// ── 파티클 풀 설정 ──
const MAX_SPARKS = 80
const MAX_RINGS = 10
const SPARK_LIFETIME = 250 // ms
const RING_LIFETIME = 350 // ms

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  color: Color
  active: boolean
}

interface Ring {
  x: number
  y: number
  age: number
  maxAge: number
  maxScale: number
  color: Color
  active: boolean
}

interface CombatEffectsProps {
  effectLevel: CombatEffectLevel
}

export const CombatEffects = ({ effectLevel }: CombatEffectsProps) => {
  const sparksRef = useRef<Points>(null)
  const sparks = useRef<Spark[]>([])
  const rings = useRef<Ring[]>([])

  // 파티클 풀 초기화
  useEffect(() => {
    const sparkPool: Spark[] = []
    for (let i = 0; i < MAX_SPARKS; i++) {
      sparkPool.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0, color: new Color(), active: false })
    }
    sparks.current = sparkPool

    const ringPool: Ring[] = []
    for (let i = 0; i < MAX_RINGS; i++) {
      ringPool.push({ x: 0, y: 0, age: 0, maxAge: 0, maxScale: 0, color: new Color(), active: false })
    }
    rings.current = ringPool
  }, [])

  // 히트 이벤트 리스너
  useEffect(() => {
    if (effectLevel === 'none') return

    const onHit = (data: { x: number; y: number; isCrit: boolean }) => {
      const sparkCount = effectLevel === 'enhanced' ? (data.isCrit ? 6 : 3) : 2
      const sparkColor = data.isCrit ? 0xffdd44 : 0xffffff

      for (let i = 0; i < sparkCount; i++) {
        const spark = sparks.current.find((s) => !s.active)
        if (!spark) break
        const angle = Math.random() * Math.PI * 2
        const speed = 15 + Math.random() * 25
        spark.x = data.x
        spark.y = data.y
        spark.vx = Math.cos(angle) * speed
        spark.vy = Math.sin(angle) * speed
        spark.age = 0
        spark.color.set(sparkColor)
        spark.active = true
      }

      // 크리티컬 플래시 링
      if (data.isCrit && effectLevel === 'enhanced') {
        const ring = rings.current.find((r) => !r.active)
        if (ring) {
          ring.x = data.x
          ring.y = data.y
          ring.age = 0
          ring.maxAge = 200
          ring.maxScale = 3
          ring.color.set(0xffee66)
          ring.active = true
        }
      }
    }

    const onDeath = (data: { x: number; y: number }) => {
      // 사망 충격파 링
      const ring = rings.current.find((r) => !r.active)
      if (ring) {
        ring.x = data.x
        ring.y = data.y
        ring.age = 0
        ring.maxAge = RING_LIFETIME
        ring.maxScale = 2.5
        ring.color.set(0xffaa44)
        ring.active = true
      }

      // 사망 파티클 버스트
      const burstCount = effectLevel === 'enhanced' ? 8 : 4
      for (let i = 0; i < burstCount; i++) {
        const spark = sparks.current.find((s) => !s.active)
        if (!spark) break
        const angle = (i / burstCount) * Math.PI * 2
        const speed = 20 + Math.random() * 15
        spark.x = data.x
        spark.y = data.y
        spark.vx = Math.cos(angle) * speed
        spark.vy = Math.sin(angle) * speed
        spark.age = 0
        spark.color.set(0xff6644)
        spark.active = true
      }
    }

    eventBus.on('combat:damageNumber', onHit)
    eventBus.on('monster:death', onDeath)

    return () => {
      eventBus.off('combat:damageNumber', onHit)
      eventBus.off('monster:death', onDeath)
    }
  }, [effectLevel])

  // 프레임 업데이트: 파티클 위치 + 수명
  useFrame((_state, delta) => {
    if (effectLevel === 'none') return
    const dt = Math.min(delta * 1000, 50)

    // 스파크 업데이트
    const points = sparksRef.current
    if (!points) return

    const positions = points.geometry.getAttribute('position')
    const colors = points.geometry.getAttribute('color')
    let activeCount = 0

    for (const spark of sparks.current) {
      if (!spark.active) continue
      spark.age += dt
      if (spark.age >= SPARK_LIFETIME) {
        spark.active = false
        continue
      }

      spark.x += spark.vx * delta
      spark.y += spark.vy * delta
      spark.vy += 30 * delta // 중력

      const alpha = 1 - spark.age / SPARK_LIFETIME

      if (activeCount < MAX_SPARKS) {
        positions.setXYZ(activeCount, spark.x, -spark.y, 5)
        colors.setXYZ(activeCount, spark.color.r * alpha, spark.color.g * alpha, spark.color.b * alpha)
        activeCount++
      }
    }

    // 나머지 비활성 파티클 숨기기
    for (let i = activeCount; i < MAX_SPARKS; i++) {
      positions.setXYZ(i, 0, 0, -100)
    }

    points.geometry.setDrawRange(0, activeCount)
    positions.needsUpdate = true
    colors.needsUpdate = true

    // 링 업데이트
    for (const ring of rings.current) {
      if (!ring.active) continue
      ring.age += dt
      if (ring.age >= ring.maxAge) {
        ring.active = false
      }
    }
  })

  if (effectLevel === 'none') return null

  return (
    <group>
      {/* 스파크 파티클 */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(MAX_SPARKS * 3), 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[new Float32Array(MAX_SPARKS * 3), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={4}
          vertexColors
          transparent
          depthWrite={false}
          sizeAttenuation={false}
        />
      </points>

      {/* 충격파 링 */}
      {rings.current.filter((r) => r.active).map((ring, i) => {
        const progress = ring.age / ring.maxAge
        const scale = ring.maxScale * progress
        const alpha = 1 - progress
        return (
          <mesh
            key={`ring-${i}`}
            position={[ring.x, -ring.y, 5]}
            scale={[scale * 10, scale * 10, 1]}
          >
            <ringGeometry args={[0.8, 1, 16]} />
            <meshBasicMaterial
              color={ring.color}
              transparent
              opacity={alpha * 0.6}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
