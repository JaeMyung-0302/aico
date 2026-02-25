/**
 * 3D 몬스터 배치 렌더링
 * InstancedMesh + vertex color (빌보딩 제거)
 *
 * MonsterBillboard 교체 컴포넌트
 * drawcall 1로 최대 60마리 동시 렌더링
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createMonsterGeometry } from '../models/monster-geometry'
import { createCelInstancedMaterial } from '../shaders/cel-instanced-shader'
import { gameToWorld } from '../core/coord-adapter'

const MAX_INSTANCES = 60
const tempObject = new Object3D()
// Billboard 32×32에 맞춘 스케일 (지오메트리 높이 17 → 시각 32px)
const MODEL_SCALE = 1.88

export const Monster3D = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createMonsterGeometry(), [])
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

    const monsters = useEntityStore.getState().monsters
    let idx = 0

    for (const m of monsters) {
      if (!m.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(...gameToWorld(m.body.x, m.body.y))
      tempObject.rotation.set(0, 0, 0)
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
