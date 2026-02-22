/**
 * 투사체 배치 렌더링
 * InstancedMesh + Canvas2D 텍스처 (16×6 화살 스프라이트)
 *
 * 좌표계: 게임 Y-down → Three.js Y-up 변환
 * 회전: angle 반전 (Y-down → Y-up) + 2.5D 빌보딩
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { getSpriteTextures } from '../assets/sprite-generator'
import { CAMERA_TILT } from '../core/CameraController'

const MAX_INSTANCES = 30
const tempObject = new Object3D()
// 빌보딩: 투사체가 지면 위에 위치하도록 Z 오프셋
const SPRITE_HALF_H = 3 // PlaneGeometry height 6 / 2
const BILLBOARD_Z = SPRITE_HALF_H * Math.sin(CAMERA_TILT)

export const ProjectileBillboard = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const texture = useMemo(() => getSpriteTextures().projectile, [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const projectiles = useEntityStore.getState().projectiles
    let idx = 0

    for (const p of projectiles) {
      if (!p.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(p.body.x, -p.body.y, BILLBOARD_Z)
      tempObject.rotation.set(-CAMERA_TILT, 0, -p.angle) // 빌보딩 + 비행 방향
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
      <planeGeometry args={[16, 6]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} />
    </instancedMesh>
  )
}
