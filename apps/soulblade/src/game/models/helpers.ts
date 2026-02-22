/**
 * 3D 모델 공용 유틸리티
 * - setVertexColor: BufferGeometry 전체 vertex에 단일 색상 할당
 * - mergeAndCenter: 여러 geometry를 병합 후 pivot을 하단 중심으로 이동
 */

import {
  Color,
  Float32BufferAttribute,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * BufferGeometry의 모든 vertex에 동일한 색상을 할당
 * InstancedMesh vertex color 기반 파트별 색상 표현에 사용
 */
export const setVertexColor = (geometry: BufferGeometry, hex: number): void => {
  const position = geometry.getAttribute('position')
  if (!position) return
  const count = position.count
  const color = new Color(hex)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
}

/**
 * 여러 BufferGeometry를 하나로 병합하고 pivot을 하단 중심으로 이동
 * mergeGeometries()는 vertex color attribute를 보존함 (Three.js r183)
 */
export const mergeAndCenter = (geometries: BufferGeometry[]): BufferGeometry => {
  if (geometries.length === 0) {
    throw new Error('mergeAndCenter: geometries 배열이 비어있음')
  }
  const merged = mergeGeometries(geometries, false)
  if (!merged) {
    throw new Error('mergeGeometries failed: geometries의 attribute 구조가 일치하지 않음')
  }

  // pivot을 하단 중심으로 이동 (boundingBox 기준)
  merged.computeBoundingBox()
  const box = merged.boundingBox!
  const offsetY = -box.min.y
  const offsetX = -(box.min.x + box.max.x) / 2
  const offsetZ = -(box.min.z + box.max.z) / 2
  merged.translate(offsetX, offsetY, offsetZ)

  return merged
}
