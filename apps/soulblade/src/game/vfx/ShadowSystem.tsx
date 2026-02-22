/**
 * 엔티티 드롭 섀도우
 * 각 활성 엔티티 아래에 타원형 그림자 렌더링
 *
 * LOD: full/reduced → 활성, minimal/canvas → 비활성
 * 그림자 크기: 플레이어 > 엘리트 > 몬스터
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEntityStore } from '../stores/useEntityStore'
import type { InstancedMesh } from 'three'
import { Matrix4, Color } from 'three'

// 그림자 설정
const SHADOW_ALPHA = 0.25
const SHADOW_COLOR = new Color(0x000000)
const MAX_SHADOWS = 60 // 플레이어(1) + 몬스터(30) + 엘리트(15) + 보스(1)
const SHADOW_Z = 0.5 // 지형 바로 위

// 엔티티별 그림자 크기
const PLAYER_SHADOW = { rx: 14, ry: 5 }
const MONSTER_SHADOW = { rx: 10, ry: 4 }
const ELITE_SHADOW = { rx: 14, ry: 5 }
const BOSS_SHADOW = { rx: 20, ry: 7 }

const _mat4 = new Matrix4()

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
      _mat4.makeScale(PLAYER_SHADOW.rx, PLAYER_SHADOW.ry, 1)
      _mat4.setPosition(player.body.x, -player.body.y, SHADOW_Z)
      mesh.setMatrixAt(idx++, _mat4)
    }

    // 몬스터 그림자
    for (const m of monsters) {
      if (!m.active || idx >= MAX_SHADOWS) continue
      _mat4.makeScale(MONSTER_SHADOW.rx, MONSTER_SHADOW.ry, 1)
      _mat4.setPosition(m.body.x, -m.body.y, SHADOW_Z)
      mesh.setMatrixAt(idx++, _mat4)
    }

    // 엘리트 그림자
    for (const e of elites) {
      if (!e.active || idx >= MAX_SHADOWS) continue
      _mat4.makeScale(ELITE_SHADOW.rx, ELITE_SHADOW.ry, 1)
      _mat4.setPosition(e.body.x, -e.body.y, SHADOW_Z)
      mesh.setMatrixAt(idx++, _mat4)
    }

    // 보스 그림자
    if (boss && boss.active && idx < MAX_SHADOWS) {
      _mat4.makeScale(BOSS_SHADOW.rx, BOSS_SHADOW.ry, 1)
      _mat4.setPosition(boss.body.x, -boss.body.y, SHADOW_Z)
      mesh.setMatrixAt(idx++, _mat4)
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
