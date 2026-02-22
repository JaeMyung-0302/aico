/**
 * 동적 포인트 라이트
 * 스킬 발동, 포탈, NPC 등에 반응하는 일시적 조명
 *
 * eventBus 이벤트로 트리거:
 * - combat:attack → 공격 시 플래시 라이트
 * - portal:enter → 포탈 상시 빛
 *
 * LOD: full/reduced → 활성, minimal/canvas → 비활성
 */

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, PointLight } from 'three'
import type { BasicAttackPattern } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'

const MAX_LIGHTS = 4
const FLASH_DURATION = 200 // ms

interface FlashLight {
  x: number
  y: number
  intensity: number
  color: number
  age: number
  maxAge: number
  active: boolean
}

interface DynamicLightsProps {
  enabled: boolean
}

export const DynamicLights = ({ enabled }: DynamicLightsProps) => {
  const lights = useRef<FlashLight[]>([])
  const groupRef = useRef<Group>(null)

  // 라이트 풀 초기화
  useEffect(() => {
    const pool: FlashLight[] = []
    for (let i = 0; i < MAX_LIGHTS; i++) {
      pool.push({ x: 0, y: 0, intensity: 0, color: 0xffffff, age: 0, maxAge: 0, active: false })
    }
    lights.current = pool
  }, [])

  // 공격 이벤트 → 플래시 라이트
  useEffect(() => {
    if (!enabled) return

    const colorMap: Record<BasicAttackPattern, number> = {
      melee_fan: 0xffaa44,         // 전사: 오렌지
      ranged_projectile: 0x44ff88, // 궁수: 녹색
      aoe_circle: 0x8844ff,        // 마법사: 보라
      mid_range_holy: 0xffee88,    // 팔라딘: 금색
    }

    const onAttack = (data: { attackPattern: BasicAttackPattern; x: number; y: number }) => {
      const light = lights.current.find((l) => !l.active)
      if (!light) return

      /** @mutates useRef pool — R3F useFrame 패턴 */
      light.x = data.x
      light.y = data.y
      light.intensity = 2
      light.color = colorMap[data.attackPattern]
      light.age = 0
      light.maxAge = FLASH_DURATION
      light.active = true
    }

    eventBus.on('combat:attack', onAttack)
    return () => {
      eventBus.off('combat:attack', onAttack)
    }
  }, [enabled])

  // 라이트 수명 업데이트
  useFrame((_state, delta) => {
    if (!enabled || !groupRef.current) return
    const dt = Math.min(delta * 1000, 50)

    const children = groupRef.current.children
    let lightIdx = 0

    for (const light of lights.current) {
      if (!light.active) continue
      light.age += dt
      if (light.age >= light.maxAge) {
        light.active = false
        continue
      }

      const progress = light.age / light.maxAge
      const currentIntensity = light.intensity * (1 - progress)

      // children 배열의 pointLight 업데이트
      const pointLight = children[lightIdx] as PointLight | undefined
      if (pointLight) {
        pointLight.position.set(light.x, -light.y, 20)
        pointLight.intensity = currentIntensity
        pointLight.color.set(light.color)
        pointLight.visible = true
      }
      lightIdx++
    }

    // 나머지 비활성 라이트 숨기기
    for (let i = lightIdx; i < MAX_LIGHTS; i++) {
      const pointLight = children[i] as PointLight | undefined
      if (pointLight) {
        pointLight.visible = false
        pointLight.intensity = 0
      }
    }
  })

  if (!enabled) return null

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_LIGHTS }, (_, i) => (
        <pointLight
          key={i}
          intensity={0}
          distance={150}
          decay={2}
          visible={false}
        />
      ))}
    </group>
  )
}
