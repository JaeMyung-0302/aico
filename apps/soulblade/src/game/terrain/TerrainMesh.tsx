/**
 * 지형 메시
 * PlaneGeometry + fbm 노이즈 기반 버텍스 컬러
 * 높낮이 displacement 없이 평면 유지 (엔티티 Z-차폐 방지)
 * meshLambertMaterial 조명 반응 (평면이라 밴드 없음, 그림자 수신 가능)
 *
 * Y축: Three.js Y-up (게임 로직 Y-down → 렌더링 시 -y)
 */

import { useEffect, useMemo } from 'react'
import { Color, PlaneGeometry, Float32BufferAttribute } from 'three'
import type { MapId } from '@soulblade/shared'

// 맵별 지형 설정
const TERRAIN_THEMES: Record<MapId, {
  baseColor: string
  colorVariation: number // 노이즈 색상 변화 강도
  segmentsPerUnit: number
}> = {
  town: {
    baseColor: '#3a5a3a',
    colorVariation: 0.16,
    segmentsPerUnit: 0.035,
  },
  serpent_forest: {
    baseColor: '#2a4e2c',
    colorVariation: 0.25,
    segmentsPerUnit: 0.035,
  },
  ice_cave: {
    baseColor: '#3a5a7a',
    colorVariation: 0.12,
    segmentsPerUnit: 0.02,
  },
  flame_castle: {
    baseColor: '#5a3a2a',
    colorVariation: 0.18,
    segmentsPerUnit: 0.018,
  },
}

// 가벼운 2D value noise
const hash2d = (ix: number, iy: number): number => {
  let h = ix * 374761393 + iy * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
}

const smoothNoise = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = hash2d(ix, iy)
  const n10 = hash2d(ix + 1, iy)
  const n01 = hash2d(ix, iy + 1)
  const n11 = hash2d(ix + 1, iy + 1)
  const nx0 = n00 + (n10 - n00) * sx
  const nx1 = n01 + (n11 - n01) * sx
  return nx0 + (nx1 - nx0) * sy
}

// Fractal Brownian Motion (3 octaves)
const fbm = (x: number, y: number): number => {
  let value = 0
  let amplitude = 1
  let frequency = 1
  for (let i = 0; i < 3; i++) {
    value += smoothNoise(x * frequency, y * frequency) * amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value
}

interface TerrainMeshProps {
  mapId: MapId
  worldWidth: number
  worldHeight: number
}

export const TerrainMesh = ({ mapId, worldWidth, worldHeight }: TerrainMeshProps) => {
  const theme = TERRAIN_THEMES[mapId]

  const geometry = useMemo(() => {
    const segX = Math.max(8, Math.floor(worldWidth * theme.segmentsPerUnit))
    const segY = Math.max(8, Math.floor(worldHeight * theme.segmentsPerUnit))
    const geo = new PlaneGeometry(worldWidth, worldHeight, segX, segY)

    // Z displacement 없음 — 평면 유지 (엔티티가 z=0에서 렌더되므로 차폐 방지)
    // 노이즈 기반 버텍스 컬러만 적용 (미세한 지면 색상 변화)
    const pos = geo.getAttribute('position')!
    const baseColor = new Color(theme.baseColor)
    const colors = new Float32Array(pos.count * 3)
    const variation = theme.colorVariation

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const noise = fbm(x * 0.015, y * 0.015) // 0~1.5 범위
      const factor = noise / 1.5 // 0~1 정규화

      colors[i * 3] = Math.min(1, baseColor.r + factor * variation * 0.8)
      colors[i * 3 + 1] = Math.min(1, baseColor.g + factor * variation)
      colors[i * 3 + 2] = Math.min(1, baseColor.b + factor * variation * 0.6)
    }
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3))

    return geo
  }, [mapId, worldWidth, worldHeight, theme])

  // 맵 전환 시 이전 geometry GPU 메모리 해제
  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  return (
    <mesh
      geometry={geometry}
      position={[worldWidth / 2, -0.1, worldHeight / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshLambertMaterial vertexColors transparent opacity={0.8} depthWrite={false} />
    </mesh>
  )
}
