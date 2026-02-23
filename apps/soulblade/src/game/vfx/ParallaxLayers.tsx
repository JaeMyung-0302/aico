/**
 * 패럴랙스 배경 레이어
 * 카메라 위치 기반 오프셋으로 깊이감 표현
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * far 레이어 (0.1x 속도): Y=-0.3
 * near 레이어 (0.4x 속도): Y=-0.25
 *
 * CanvasTexture + RepeatWrapping으로 프로시저럴 패턴
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, NearestFilter } from 'three'
import type { Mesh } from 'three'
import type { MapId } from '@soulblade/shared'

// 패럴랙스 팩터
const FAR_FACTOR = 0.1
const NEAR_FACTOR = 0.4
const FAR_Y = -0.3
const NEAR_Y = -0.25
const FAR_ALPHA = 0.5
const NEAR_ALPHA = 0.3
const TILE_SIZE = 128

// 맵별 패럴랙스 색상
const PARALLAX_THEMES: Record<MapId, {
  farColor: string
  farAccent: string
  nearColor: string
  nearAccent: string
}> = {
  town: {
    farColor: '#1a2a1a', farAccent: '#2a3a2a',
    nearColor: '#223322', nearAccent: '#334433',
  },
  serpent_forest: {
    farColor: '#0e1e0e', farAccent: '#1e2e1e',
    nearColor: '#152515', nearAccent: '#253525',
  },
  ice_cave: {
    farColor: '#101e2e', farAccent: '#1a2e3e',
    nearColor: '#152535', nearAccent: '#253545',
  },
  flame_castle: {
    farColor: '#2a1010', farAccent: '#3a1a1a',
    nearColor: '#351515', nearAccent: '#452020',
  },
}

// 프로시저럴 패럴랙스 텍스처 생성
const createParallaxTexture = (baseColor: string, accentColor: string, density: number): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)

  // 랜덤 점/선 패턴
  ctx.fillStyle = accentColor
  for (let i = 0; i < density; i++) {
    const x = (Math.sin(i * 47.3) * 0.5 + 0.5) * TILE_SIZE
    const y = (Math.cos(i * 61.7) * 0.5 + 0.5) * TILE_SIZE
    const size = 1 + (Math.sin(i * 13.1) * 0.5 + 0.5) * 2
    ctx.fillRect(x, y, size, size)
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  return texture
}

interface ParallaxLayersProps {
  mapId: MapId
  worldWidth: number
  worldHeight: number
  enabled: boolean
  layerCount: number // 0, 2, 3
}

export const ParallaxLayers = ({ mapId, worldWidth, worldHeight, enabled, layerCount }: ParallaxLayersProps) => {
  const farRef = useRef<Mesh>(null)
  const nearRef = useRef<Mesh>(null)
  const { camera } = useThree()

  const theme = PARALLAX_THEMES[mapId]

  const farTexture = useMemo(() => {
    const tex = createParallaxTexture(theme.farColor, theme.farAccent, 15)
    tex.repeat.set((worldWidth + 3000) / TILE_SIZE, (worldHeight + 3000) / TILE_SIZE)
    return tex
  }, [mapId, worldWidth, worldHeight, theme])

  const nearTexture = useMemo(() => {
    const tex = createParallaxTexture(theme.nearColor, theme.nearAccent, 25)
    tex.repeat.set((worldWidth + 2500) / TILE_SIZE, (worldHeight + 2500) / TILE_SIZE)
    return tex
  }, [mapId, worldWidth, worldHeight, theme])

  // GPU 메모리 해제
  useEffect(() => {
    return () => {
      farTexture.dispose()
      nearTexture.dispose()
    }
  }, [farTexture, nearTexture])

  // 카메라 위치 기반 패럴랙스 오프셋 (XZ 평면)
  useFrame(() => {
    if (!enabled) return

    const camX = camera.position.x
    const camZ = camera.position.z

    if (farRef.current) {
      farRef.current.position.x = camX * (1 - FAR_FACTOR) + worldWidth / 2 * FAR_FACTOR
      farRef.current.position.z = camZ * (1 - FAR_FACTOR) + worldHeight / 2 * FAR_FACTOR
    }

    if (nearRef.current && layerCount >= 2) {
      nearRef.current.position.x = camX * (1 - NEAR_FACTOR) + worldWidth / 2 * NEAR_FACTOR
      nearRef.current.position.z = camZ * (1 - NEAR_FACTOR) + worldHeight / 2 * NEAR_FACTOR
    }
  })

  if (!enabled || layerCount < 1) return null

  return (
    <group>
      {/* Far layer — 와이드스크린 대응 확장 */}
      <mesh ref={farRef} position={[worldWidth / 2, FAR_Y, worldHeight / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[worldWidth + 3000, worldHeight + 3000]} />
        <meshBasicMaterial
          map={farTexture}
          transparent
          opacity={FAR_ALPHA}
          depthWrite={false}
        />
      </mesh>

      {/* Near layer */}
      {layerCount >= 2 && (
        <mesh ref={nearRef} position={[worldWidth / 2, NEAR_Y, worldHeight / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[worldWidth + 2500, worldHeight + 2500]} />
          <meshBasicMaterial
            map={nearTexture}
            transparent
            opacity={NEAR_ALPHA}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
