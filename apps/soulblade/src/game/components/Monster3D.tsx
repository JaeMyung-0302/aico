/**
 * 3D 몬스터 배치 렌더링
 * InstancedMesh + vertex color (빌보딩 제거)
 *
 * MonsterBillboard 교체 컴포넌트
 * drawcall 1로 최대 60마리 동시 렌더링
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, MeshLambertMaterial } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createMonsterGeometry } from '../models/monster-geometry'

const MAX_INSTANCES = 60
const tempObject = new Object3D()

export const Monster3D = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createMonsterGeometry(), [])
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

    const monsters = useEntityStore.getState().monsters
    let idx = 0

    for (const m of monsters) {
      if (!m.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(m.body.x, -m.body.y, 0)
      tempObject.rotation.set(0, 0, 0)
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
