/**
 * 엔티티 글로우 이펙트
 * - 엘리트 오라: 변이 색상 타원형 글로우
 * - 플레이어 호흡: scaleX/Y 미세 진동
 *
 * LOD: full/reduced → 글로우, full → 호흡
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEntityStore } from '../stores/useEntityStore'
import type { InstancedMesh } from 'three'
import { Matrix4, Color } from 'three'

// 글로우 설정
const GLOW_ALPHA = 0.18
const GLOW_RX = 18 // X 반경
const GLOW_RY = 10 // Y 반경
const MAX_GLOWS = 20 // 엘리트 + 보스
const GLOW_Z = 3 // 엔티티 아래

// 호흡 설정
const BREATH_MIN = 0.98
const BREATH_MAX = 1.02
const BREATH_SPEED = 1.2 // 초당 사이클

const _mat4 = new Matrix4()
const _color = new Color()

interface EntityGlowProps {
  enableGlow: boolean
  enableBreath: boolean
}

export const EntityGlow = ({ enableGlow, enableBreath }: EntityGlowProps) => {
  const glowRef = useRef<InstancedMesh>(null)
  // 플레이어 호흡 state
  const breathScaleRef = useRef({ sx: 1, sy: 1 })
  const elapsedRef = useRef(0)

  useFrame((_state, delta) => {
    const { player, elites, boss } = useEntityStore.getState()
    elapsedRef.current += delta
    const t = elapsedRef.current

    // 플레이어 호흡 애니메이션
    if (enableBreath && player && player.active) {
      const breathPhase = Math.sin(t * Math.PI * BREATH_SPEED)
      breathScaleRef.current.sx = 1 + breathPhase * (BREATH_MAX - 1)
      breathScaleRef.current.sy = 1 - breathPhase * (BREATH_MAX - 1)
    }

    // 엘리트 글로우
    const mesh = glowRef.current
    if (!mesh || !enableGlow) {
      if (mesh) mesh.count = 0
      return
    }

    let idx = 0

    for (const e of elites) {
      if (!e.active || idx >= MAX_GLOWS) continue
      _mat4.makeScale(GLOW_RX * e.scale, GLOW_RY * e.scale, 1)
      _mat4.setPosition(e.body.x, -e.body.y, GLOW_Z)
      mesh.setMatrixAt(idx, _mat4)

      // 변이별 tint 색상
      _color.set(e.tint)
      mesh.setColorAt(idx, _color)
      idx++
    }

    // 보스 글로우 (크기 확대)
    if (boss && boss.active && idx < MAX_GLOWS) {
      _mat4.makeScale(GLOW_RX * 2, GLOW_RY * 2, 1)
      _mat4.setPosition(boss.body.x, -boss.body.y, GLOW_Z)
      mesh.setMatrixAt(idx, _mat4)
      _color.set(0xff4444)
      mesh.setColorAt(idx, _color)
      idx++
    }

    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  if (!enableGlow) return null

  return (
    <instancedMesh ref={glowRef} args={[undefined, undefined, MAX_GLOWS]}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial
        transparent
        opacity={GLOW_ALPHA}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
