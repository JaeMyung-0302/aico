/**
 * 3D 엘리트 몬스터 배치 렌더링
 * InstancedMesh + vertex color + instanceColor 틴트
 *
 * EliteBillboard 교체 컴포넌트
 * mutation 색상 틴트: instanceColor × vertexColor
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, Color } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createEliteGeometry } from '../models/elite-geometry'
import { createCelInstancedMaterial } from '../shaders/cel-instanced-shader'
import { gameToWorld } from '../core/coord-adapter'

const MAX_INSTANCES = 20
const tempObject = new Object3D()
const tempColor = new Color()
// Billboard 32×32에 맞춘 스케일 (지오메트리 높이 27 → 시각 32px)
const MODEL_SCALE = 1.19

export const Elite3D = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createEliteGeometry(), [])
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

    const elites = useEntityStore.getState().elites
    let idx = 0

    for (const e of elites) {
      if (!e.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(...gameToWorld(e.body.x, e.body.y))
      tempObject.rotation.set(0, 0, 0)
      const s = e.scale * MODEL_SCALE
      tempObject.scale.set(s, s, s)
      tempObject.updateMatrix()
      mesh.setMatrixAt(idx, tempObject.matrix)

      // mutation 색상 틴트 (vertexColor × instanceColor)
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
      args={[geometry, material, MAX_INSTANCES]}
      frustumCulled={false}
    />
  )
}
