/**
 * 투사체 배치 렌더링
 * InstancedMesh + Canvas2D 텍스처 (16×6 화살 스프라이트)
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * 빌보딩: 카메라 quaternion 복사 + 로컬 Z 회전으로 비행 방향 표현
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { useSpriteTextures } from '../assets/sprite-loader'

const MAX_INSTANCES = 30
const tempObject = new Object3D()
// 투사체가 지면 위에 위치하도록 Y 오프셋
const SPRITE_HALF_H = 3 // PlaneGeometry height 6 / 2
const BILLBOARD_Y = SPRITE_HALF_H

export const ProjectileBillboard = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const { textures } = useSpriteTextures()
  const texture = useMemo(() => textures.projectile, [textures])

  useFrame(({ camera }) => {
    const mesh = meshRef.current
    if (!mesh) return

    const projectiles = useEntityStore.getState().projectiles
    let idx = 0

    for (const p of projectiles) {
      if (!p.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(p.body.x, BILLBOARD_Y, p.body.y)
      tempObject.quaternion.copy(camera.quaternion)
      tempObject.rotateZ(-p.angle) // 로컬 Z 회전으로 비행 방향
      tempObject.scale.set(1, 1, 1)
      tempObject.updateMatrix()
      mesh.setMatrixAt(idx, tempObject.matrix)
      idx++
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.count = idx
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_INSTANCES]}
      frustumCulled={false}
    >
      <planeGeometry args={[16, 6]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} />
    </instancedMesh>
  )
}
