/**
 * 몬스터 배치 렌더링
 * InstancedMesh + Canvas2D 텍스처 (24×24 스프라이트)
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * 빌보딩: 카메라 quaternion 복사
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { useSpriteTextures } from '../assets/sprite-loader'

const MAX_INSTANCES = 60
const tempObject = new Object3D()
// 스프라이트 중심이 지면 위에 위치하도록 Y 오프셋
const SPRITE_HALF_H = 16 // PlaneGeometry height 32 / 2
const BILLBOARD_Y = SPRITE_HALF_H

export const MonsterBillboard = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const { textures } = useSpriteTextures()
  const texture = useMemo(() => textures.monster, [textures])

  useFrame(({ camera }) => {
    const mesh = meshRef.current
    if (!mesh) return

    const monsters = useEntityStore.getState().monsters
    let idx = 0

    for (const m of monsters) {
      if (!m.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(m.body.x, BILLBOARD_Y, m.body.y)
      tempObject.quaternion.copy(camera.quaternion)
      tempObject.scale.set(1, 1, 1)
      tempObject.updateMatrix()
      mesh.setMatrixAt(idx, tempObject.matrix)
      idx++
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.count = idx
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]}>
      {/* 텍스처 24x24 → 게임 월드 body 크기 32x32로 스케일업 (정사각 비율 유지) */}
      <planeGeometry args={[32, 32]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} />
    </instancedMesh>
  )
}
