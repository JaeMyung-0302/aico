/**
 * 공격 이펙트 렌더링
 * eventBus 'combat:attack' 리슨 → 클래스별 공격 시각화
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * - melee_fan: 호 모양 슬래시 (Warrior)
 * - aoe_circle: 마법진 원형 (Mage)
 * - mid_range_holy: 성광 직선 (Paladin)
 * - ranged_projectile: Archer는 투사체 자체가 이펙트 (스킵)
 *
 * Three.js Ring/Plane 기반, useFrame 애니메이션
 */

import { useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import type { BasicAttackPattern } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'

// ── 이펙트 풀 ──
const MAX_EFFECTS = 8
const EFFECT_Y = 8 // 지면 위 높이

// 클래스별 색상
const ATTACK_COLORS: Record<
  BasicAttackPattern,
  { main: string; glow: string }
> = {
  melee_fan: { main: '#4488ff', glow: '#88ccff' },
  aoe_circle: { main: '#9966ff', glow: '#bb88ff' },
  mid_range_holy: { main: '#ffdd44', glow: '#ffee88' },
  ranged_projectile: { main: '#88ff88', glow: '#aaffaa' },
}

interface AttackEffect {
  x: number
  y: number
  angle: number
  pattern: BasicAttackPattern
  age: number
  maxAge: number
  active: boolean
}

interface AttackEffectsProps {
  enabled: boolean
}

export const AttackEffects = ({ enabled }: AttackEffectsProps) => {
  const effects = useRef<AttackEffect[]>([])

  // 이펙트 풀 초기화
  useEffect(() => {
    const pool: AttackEffect[] = []
    for (let i = 0; i < MAX_EFFECTS; i++) {
      pool.push({
        x: 0,
        y: 0,
        angle: 0,
        pattern: 'melee_fan',
        age: 0,
        maxAge: 200,
        active: false,
      })
    }
    effects.current = pool
  }, [])

  const spawnEffect = useCallback(
    (data: {
      attackPattern: BasicAttackPattern
      x: number
      y: number
      facingAngle: number
    }) => {
      if (!enabled) return
      // Archer는 투사체 자체가 이펙트
      if (data.attackPattern === 'ranged_projectile') return

      const effect = effects.current.find((e) => !e.active)
      if (!effect) return

      effect.x = data.x
      effect.y = data.y
      effect.angle = data.facingAngle
      effect.pattern = data.attackPattern
      effect.age = 0
      effect.maxAge = data.attackPattern === 'aoe_circle' ? 350 : 200
      effect.active = true
    },
    [enabled],
  )

  useEffect(() => {
    if (!enabled) return
    eventBus.on('combat:attack', spawnEffect)
    return () => {
      eventBus.off('combat:attack', spawnEffect)
    }
  }, [enabled, spawnEffect])

  // 수명 업데이트
  useFrame((_state, delta) => {
    if (!enabled) return
    const dt = Math.min(delta * 1000, 50)

    for (const e of effects.current) {
      if (!e.active) continue
      e.age += dt
      if (e.age >= e.maxAge) {
        e.active = false
      }
    }
  })

  if (!enabled) return null

  return (
    <group>
      {effects.current.map((effect, i) => {
        if (!effect.active) return null
        const progress = effect.age / effect.maxAge
        const alpha = 1 - progress

        switch (effect.pattern) {
          case 'melee_fan':
            return (
              <SlashEffect
                key={i}
                effect={effect}
                progress={progress}
                alpha={alpha}
              />
            )
          case 'aoe_circle':
            return (
              <AoeCircleEffect
                key={i}
                effect={effect}
                progress={progress}
                alpha={alpha}
              />
            )
          case 'mid_range_holy':
            return (
              <HolyBeamEffect
                key={i}
                effect={effect}
                progress={progress}
                alpha={alpha}
              />
            )
          default:
            return null
        }
      })}
    </group>
  )
}

// ── Slash Effect (Warrior: melee_fan) ──
const SlashEffect = ({
  effect,
  progress,
  alpha,
}: {
  effect: AttackEffect
  progress: number
  alpha: number
}) => {
  const colors = ATTACK_COLORS.melee_fan
  const arcAngle = 1.6 // ±0.8 radians
  const radius = 55
  const sweepProgress = Math.min(progress * 2, 1) // 전반부에 빠르게 완성

  const startAngle = effect.angle - arcAngle / 2

  return (
    <group>
      {/* 글로우 호 */}
      <mesh
        position={[effect.x, EFFECT_Y, effect.y]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry
          args={[
            radius - 8,
            radius + 8,
            16,
            1,
            startAngle,
            arcAngle * sweepProgress,
          ]}
        />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={alpha * 0.3}
          depthWrite={false}
        />
      </mesh>

      {/* 메인 호 */}
      <mesh
        position={[effect.x, EFFECT_Y + 0.1, effect.y]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry
          args={[
            radius - 3,
            radius + 3,
            16,
            1,
            startAngle,
            arcAngle * sweepProgress,
          ]}
        />
        <meshBasicMaterial
          color={colors.main}
          transparent
          opacity={alpha * 0.8}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ── AoE Circle Effect (Mage) ──
const AoeCircleEffect = ({
  effect,
  progress,
  alpha,
}: {
  effect: AttackEffect
  progress: number
  alpha: number
}) => {
  const colors = ATTACK_COLORS.aoe_circle
  const radius = 60
  const expandScale = 0.3 + progress * 0.7 // 0.3 → 1.0으로 확장

  return (
    <group
      position={[effect.x, EFFECT_Y, effect.y]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {/* 글로우 필 */}
      <mesh scale={[expandScale, expandScale, 1]}>
        <circleGeometry args={[radius * 0.6, 16]} />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={alpha * 0.15}
          depthWrite={false}
        />
      </mesh>

      {/* 메인 원 */}
      <mesh scale={[expandScale, expandScale, 1]}>
        <ringGeometry args={[radius - 2, radius + 2, 24]} />
        <meshBasicMaterial
          color={colors.main}
          transparent
          opacity={alpha * 0.7}
          depthWrite={false}
        />
      </mesh>

      {/* 내부 룬 서클 */}
      <mesh scale={[expandScale, expandScale, 1]}>
        <ringGeometry args={[radius * 0.63, radius * 0.67, 24]} />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={alpha * 0.5}
          depthWrite={false}
        />
      </mesh>

      {/* 확장 웨이브 */}
      {progress < 0.6 && (
        <mesh scale={[progress * 3.5, progress * 3.5, 1]}>
          <ringGeometry args={[radius * 0.28, radius * 0.32, 16]} />
          <meshBasicMaterial
            color={colors.main}
            transparent
            opacity={(1 - progress / 0.6) * 0.4}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

// ── Holy Beam Effect (Paladin: mid_range_holy) ──
const HolyBeamEffect = ({
  effect,
  progress,
  alpha,
}: {
  effect: AttackEffect
  progress: number
  alpha: number
}) => {
  const colors = ATTACK_COLORS.mid_range_holy
  const length = 60
  const width = 30
  const expandProgress = Math.min(progress * 3, 1) // 빠르게 확장

  // XZ 평면 방향 벡터 기반 위치 오프셋
  const cosA = Math.cos(effect.angle)
  const sinA = Math.sin(effect.angle)
  const offsetX = cosA * length * 0.5
  const offsetZ = sinA * length * 0.5

  return (
    <group
      position={[effect.x + offsetX, EFFECT_Y, effect.y + offsetZ]}
      rotation={[-Math.PI / 2, 0, -effect.angle]}
    >
      {/* 외부 글로우 */}
      <mesh>
        <planeGeometry
          args={[length * expandProgress + 12, width * expandProgress + 12]}
        />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={alpha * 0.2}
          depthWrite={false}
        />
      </mesh>

      {/* 메인 빔 */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry
          args={[length * expandProgress, width * expandProgress * 0.6]}
        />
        <meshBasicMaterial
          color={colors.main}
          transparent
          opacity={alpha * 0.6}
          depthWrite={false}
        />
      </mesh>

      {/* 십자 패턴 */}
      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[length * expandProgress * 0.8, 4]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={alpha * 0.4}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[4, width * expandProgress * 0.4]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={alpha * 0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
