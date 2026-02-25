/**
 * 3D 투사체 배치 렌더링
 * InstancedMesh + vertex color (빌보딩 제거)
 *
 * ProjectileBillboard 교체 컴포넌트
 * Z축 회전으로 비행 방향 표현 (빌보딩 X회전 제거)
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createProjectileGeometry } from '../models/projectile-geometry'
import { createCelInstancedMaterial } from '../shaders/cel-instanced-shader'
import { gameToWorld } from '../core/coord-adapter'

const MAX_INSTANCES = 30
const tempObject = new Object3D()
// Billboard 16×6에 맞춘 스케일 (지오메트리 길이 14 → 시각 16px)
const MODEL_SCALE = 1.14

export const Projectile3D = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createProjectileGeometry(), [])
  const material = useMemo(() => createCelInstancedMaterial(), [])

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

      tempObject.position.set(...gameToWorld(p.body.x, p.body.y))
      tempObject.rotation.set(0, -p.angle, 0)
      tempObject.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE)
      tempObject.updateMatrix()
      mesh.setMatrixAt(idx, tempObject.matrix)
      idx++
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.count = idx
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_INSTANCES]} frustumCulled={false} />
  )
}
