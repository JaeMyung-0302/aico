/**
 * Inverted Hull 아웃라인 렌더러
 * 대상 Group을 clone하여 아웃라인 Material로 교체 렌더링
 *
 * LOD full에서만 활성화 (useLodStore.enableOutline)
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import type { Group, Object3D } from 'three'
import { createOutlineMaterial } from '../shaders/outline-material'
import type { OutlineMaterialOptions } from '../shaders/outline-material'

interface OutlinePassProps {
  /** 아웃라인을 적용할 원본 모델 Group */
  readonly model: Group
  /** 원본 모델의 groupRef (위치/스케일 동기화) */
  readonly sourceRef: React.RefObject<Group | null>
  /** 아웃라인 두께 */
  readonly thickness?: number
  /** 아웃라인 색상 hex */
  readonly color?: number
  /** 활성 여부 (LOD 분기) */
  readonly enabled?: boolean
}

export const OutlinePass = ({
  model,
  sourceRef,
  thickness = 0.03,
  color = 0x111111,
  enabled = true,
}: OutlinePassProps) => {
  const outlineRef = useRef<Group>(null)

  const outlineOptions: OutlineMaterialOptions = useMemo(
    () => ({ thickness, color }),
    [thickness, color],
  )

  // 아웃라인 전용 clone 생성 (material만 교체)
  const outlineModel = useMemo(() => {
    if (!enabled) return null
    const cloned = model.clone(true)
    const mat = createOutlineMaterial(outlineOptions)
    cloned.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        // clone(true)의 기존 material은 참조 공유 — cleanup에서 geometry만 dispose
        child.material = mat
      }
    })
    return cloned
  }, [model, enabled, outlineOptions])

  // cleanup: 아웃라인 geometry + material dispose
  useEffect(() => {
    return () => {
      if (!outlineModel) return
      let materialDisposed = false
      outlineModel.traverse((child: Object3D) => {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          if (!materialDisposed) {
            child.material.dispose()
            materialDisposed = true // 공유 material이므로 한 번만 dispose
          }
        }
      })
    }
  }, [outlineModel])

  // 원본 모델과 위치/스케일/회전 동기화
  useFrame(() => {
    if (!outlineRef.current || !sourceRef.current) return
    outlineRef.current.position.copy(sourceRef.current.position)
    outlineRef.current.scale.copy(sourceRef.current.scale)
    outlineRef.current.rotation.copy(sourceRef.current.rotation)
  })

  if (!enabled || !outlineModel) return null

  return <primitive ref={outlineRef} object={outlineModel} />
}
