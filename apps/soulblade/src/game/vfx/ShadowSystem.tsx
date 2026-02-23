/**
 * 엔티티 드롭 섀도우
 * 각 활성 엔티티 아래에 타원형 그림자 렌더링
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * LOD: full/reduced → 활성, minimal/canvas → 비활성
 * 그림자 크기: 플레이어 > 엘리트 > 몬스터
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEntityStore } from '../stores/useEntityStore'
import type { InstancedMesh } from 'three'
import { Object3D, Color } from 'three'
import { gameToWorld } from '../core/coord-adapter'

// 그림자 설정
const SHADOW_ALPHA = 0.25
const SHADOW_COLOR = new Color(0x000000)
const MAX_SHADOWS = 60 // 플레이어(1) + 몬스터(30) + 엘리트(15) + 보스(1)
const SHADOW_Y = 0.01 // 지면 바로 위 (z-fighting 방지)

// 엔티티별 그림자 크기
const PLAYER_SHADOW = { rx: 14, ry: 5 }
const MONSTER_SHADOW = { rx: 10, ry: 4 }
const ELITE_SHADOW = { rx: 14, ry: 5 }
const BOSS_SHADOW = { rx: 20, ry: 7 }

const _tempObj = new Object3D()

interface ShadowSystemProps {
  enabled: boolean
}

export const ShadowSystem = ({ enabled }: ShadowSystemProps) => {
  const meshRef = useRef<InstancedMesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh || !enabled) {
      if (mesh) mesh.count = 0
      return
    }

    const { player, monsters, elites, boss } = useEntityStore.getState()
    let idx = 0

    // 플레이어 그림자
    if (player && player.active) {
      const [wx, , wz] = gameToWorld(player.body.x, player.body.y)
      _tempObj.position.set(wx, SHADOW_Y, wz)
      _tempObj.rotation.set(-Math.PI / 2, 0, 0) // XZ 평면에 놓기
      _tempObj.scale.set(PLAYER_SHADOW.rx, PLAYER_SHADOW.ry, 1)
      _tempObj.updateMatrix()
      mesh.setMatrixAt(idx++, _tempObj.matrix)
    }

    // 몬스터 그림자
    for (const m of monsters) {
      if (!m.active || idx >= MAX_SHADOWS) continue
      const [wx, , wz] = gameToWorld(m.body.x, m.body.y)
      _tempObj.position.set(wx, SHADOW_Y, wz)
      _tempObj.rotation.set(-Math.PI / 2, 0, 0)
      _tempObj.scale.set(MONSTER_SHADOW.rx, MONSTER_SHADOW.ry, 1)
      _tempObj.updateMatrix()
      mesh.setMatrixAt(idx++, _tempObj.matrix)
    }

    // 엘리트 그림자
    for (const e of elites) {
      if (!e.active || idx >= MAX_SHADOWS) continue
      const [wx, , wz] = gameToWorld(e.body.x, e.body.y)
      _tempObj.position.set(wx, SHADOW_Y, wz)
      _tempObj.rotation.set(-Math.PI / 2, 0, 0)
      _tempObj.scale.set(ELITE_SHADOW.rx, ELITE_SHADOW.ry, 1)
      _tempObj.updateMatrix()
      mesh.setMatrixAt(idx++, _tempObj.matrix)
    }

    // 보스 그림자
    if (boss && boss.active && idx < MAX_SHADOWS) {
      const [wx, , wz] = gameToWorld(boss.body.x, boss.body.y)
      _tempObj.position.set(wx, SHADOW_Y, wz)
      _tempObj.rotation.set(-Math.PI / 2, 0, 0)
      _tempObj.scale.set(BOSS_SHADOW.rx, BOSS_SHADOW.ry, 1)
      _tempObj.updateMatrix()
      mesh.setMatrixAt(idx++, _tempObj.matrix)
    }

    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
  })

  if (!enabled) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_SHADOWS]}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial
        color={SHADOW_COLOR}
        transparent
        opacity={SHADOW_ALPHA}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
