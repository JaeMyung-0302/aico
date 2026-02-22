/**
 * 엘리트 몬스터 배치 렌더링
 * InstancedMesh + Canvas2D 텍스처 (32×32 스프라이트)
 * instanceColor로 mutation 색상 틴트 적용
 *
 * 좌표계: 게임 Y-down → Three.js Y-up 변환
 * 2.5D 빌보딩: 카메라 기울기만큼 스프라이트를 회전
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, Color } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { getSpriteTextures } from '../assets/sprite-generator'
import { CAMERA_TILT } from '../core/CameraController'

const MAX_INSTANCES = 20
const tempObject = new Object3D()
const tempColor = new Color()
// 빌보딩: 스프라이트 하단이 Z=0(지면)에 위치하도록 Z 오프셋
const SPRITE_HALF_H = 16 // PlaneGeometry height 32 / 2
const BILLBOARD_Z = SPRITE_HALF_H * Math.sin(CAMERA_TILT)

export const EliteBillboard = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const texture = useMemo(() => getSpriteTextures().elite, [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const elites = useEntityStore.getState().elites
    let idx = 0

    for (const e of elites) {
      if (!e.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(e.body.x, -e.body.y, BILLBOARD_Z * e.scale)
      tempObject.rotation.set(-CAMERA_TILT, 0, 0)
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]}>
      <planeGeometry args={[32, 32]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} />
    </instancedMesh>
  )
}
