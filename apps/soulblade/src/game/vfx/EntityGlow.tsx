/**
 * 엔티티 글로우 이펙트
 * - 엘리트 오라: 변이 색상 타원형 글로우
 * - 플레이어 호흡: scaleX/Y 미세 진동
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * LOD: full/reduced → 글로우, full → 호흡
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEntityStore } from '../stores/useEntityStore'
import type { InstancedMesh } from 'three'
import { Object3D, Color } from 'three'
import { gameToWorld } from '../core/coord-adapter'

// 글로우 설정
const GLOW_ALPHA = 0.18
const GLOW_RX = 18 // X 반경
const GLOW_RY = 10 // Z 반경 (구 Y → 3D Z)
const MAX_GLOWS = 20 // 엘리트 + 보스
const GLOW_HEIGHT = 0.02 // 섀도우 위

const _tempObj = new Object3D()
const _color = new Color()

interface EntityGlowProps {
  enableGlow: boolean
  enableBreath: boolean
}

export const EntityGlow = ({ enableGlow }: EntityGlowProps) => {
  const glowRef = useRef<InstancedMesh>(null)
  const elapsedRef = useRef(0)

  useFrame((_state, delta) => {
    const { player, elites, boss } = useEntityStore.getState()
    elapsedRef.current += delta
    const t = elapsedRef.current

    // 엘리트 글로우
    const mesh = glowRef.current
    if (!mesh || !enableGlow) {
      if (mesh) mesh.count = 0
      return
    }

    let idx = 0

    for (const e of elites) {
      if (!e.active || idx >= MAX_GLOWS) continue
      const [wx, , wz] = gameToWorld(e.body.x, e.body.y)
      _tempObj.position.set(wx, GLOW_HEIGHT, wz)
      _tempObj.rotation.set(-Math.PI / 2, 0, 0) // XZ 평면에 놓기
      _tempObj.scale.set(GLOW_RX * e.scale, GLOW_RY * e.scale, 1)
      _tempObj.updateMatrix()
      mesh.setMatrixAt(idx, _tempObj.matrix)

      // 변이별 tint 색상
      _color.set(e.tint)
      mesh.setColorAt(idx, _color)
      idx++
    }

    // 보스 글로우 (크기 확대)
    if (boss && boss.active && idx < MAX_GLOWS) {
      const [wx, , wz] = gameToWorld(boss.body.x, boss.body.y)
      _tempObj.position.set(wx, GLOW_HEIGHT, wz)
      _tempObj.rotation.set(-Math.PI / 2, 0, 0)
      _tempObj.scale.set(GLOW_RX * 2, GLOW_RY * 2, 1)
      _tempObj.updateMatrix()
      mesh.setMatrixAt(idx, _tempObj.matrix)
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
