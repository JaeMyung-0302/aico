/**
 * 3D 투사체 배치 렌더링
 * InstancedMesh + vertex color (빌보딩 제거)
 *
 * ProjectileBillboard 교체 컴포넌트
 * Z축 회전으로 비행 방향 표현 (빌보딩 X회전 제거)
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, MeshLambertMaterial } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createProjectileGeometry } from '../models/projectile-geometry'

const MAX_INSTANCES = 30
const tempObject = new Object3D()

export const Projectile3D = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createProjectileGeometry(), [])
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const projectiles = useEntityStore.getState().projectiles
    let idx = 0

    for (const p of projectiles) {
      if (!p.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(p.body.x, -p.body.y, 0)
      tempObject.rotation.set(0, 0, -p.angle)
      tempObject.scale.set(1, 1, 1)
      tempObject.updateMatrix()
      mesh.setMatrixAt(idx, tempObject.matrix)
      idx++
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.count = idx
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_INSTANCES]} />
  )
}
