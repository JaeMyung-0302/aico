/**
 * 엘리트 몬스터 배치 렌더링
 * InstancedMesh + Canvas2D 텍스처 (32×32 스프라이트)
 * instanceColor로 mutation 색상 틴트 적용
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * 빌보딩: 카메라 quaternion 복사
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, Color } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { useSpriteTextures } from '../assets/sprite-loader'

const MAX_INSTANCES = 20
const tempObject = new Object3D()
const tempColor = new Color()
// 스프라이트 중심이 지면 위에 위치하도록 Y 오프셋
const SPRITE_HALF_H = 20 // PlaneGeometry height 40 / 2
const BILLBOARD_Y = SPRITE_HALF_H

export const EliteBillboard = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const { textures } = useSpriteTextures()
  const texture = useMemo(() => textures.elite, [textures])

  useFrame(({ camera }) => {
    const mesh = meshRef.current
    if (!mesh) return

    const elites = useEntityStore.getState().elites
    let idx = 0

    for (const e of elites) {
      if (!e.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(e.body.x, BILLBOARD_Y * e.scale, e.body.y)
      tempObject.quaternion.copy(camera.quaternion)
      tempObject.scale.set(e.scale, e.scale, 1)
      tempObject.updateMatrix()
      mesh.setMatrixAt(idx, tempObject.matrix)

      // mutation 색상 틴트 (텍스처 × instanceColor)
      tempColor.set(e.tint)
      mesh.setColorAt(idx, tempColor)

      idx++
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = idx
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_INSTANCES]}
      frustumCulled={false}
    >
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} />
    </instancedMesh>
  )
}
