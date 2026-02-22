/**
 * 몬스터 배치 렌더링
 * InstancedMesh + Canvas2D 텍스처 (24×24 스프라이트)
 *
 * 좌표계: 게임 Y-down → Three.js Y-up 변환
 * 2.5D 빌보딩: 카메라 기울기만큼 스프라이트를 회전
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { getSpriteTextures } from '../assets/sprite-generator'
import { CAMERA_TILT } from '../core/CameraController'

const MAX_INSTANCES = 60
const tempObject = new Object3D()
// 빌보딩: 스프라이트 하단이 Z=0(지면)에 위치하도록 Z 오프셋
const SPRITE_HALF_H = 16 // PlaneGeometry height 32 / 2
const BILLBOARD_Z = SPRITE_HALF_H * Math.sin(CAMERA_TILT)

export const MonsterBillboard = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const texture = useMemo(() => getSpriteTextures().monster, [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const monsters = useEntityStore.getState().monsters
    let idx = 0

    for (const m of monsters) {
      if (!m.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(m.body.x, -m.body.y, BILLBOARD_Z)
      tempObject.rotation.set(-CAMERA_TILT, 0, 0)
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
