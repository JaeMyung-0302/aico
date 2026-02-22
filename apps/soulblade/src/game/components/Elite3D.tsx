/**
 * 3D 엘리트 몬스터 배치 렌더링
 * InstancedMesh + vertex color + instanceColor 틴트
 *
 * EliteBillboard 교체 컴포넌트
 * mutation 색상 틴트: instanceColor × vertexColor
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, Color, MeshLambertMaterial } from 'three'
import type { InstancedMesh } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createEliteGeometry } from '../models/elite-geometry'

const MAX_INSTANCES = 20
const tempObject = new Object3D()
const tempColor = new Color()

export const Elite3D = () => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createEliteGeometry(), [])
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const elites = useEntityStore.getState().elites
    let idx = 0

    for (const e of elites) {
      if (!e.active) continue
      if (idx >= MAX_INSTANCES) break

      tempObject.position.set(e.body.x, -e.body.y, 0)
      tempObject.rotation.set(0, 0, 0)
      tempObject.scale.set(e.scale, e.scale, e.scale)
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
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_INSTANCES]} />
  )
}
