/**
 * 배경 타일 렌더링
 * CanvasTexture로 프로시저럴 패턴 생성 + RepeatWrapping
 *
 * 맵별 고유 배경 패턴 (잔디/돌/얼음/용암 텍스처)
 * TerrainMesh 아래 Z=-2 레이어에 배치
 */

import { useEffect, useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, NearestFilter } from 'three'
import type { MapId } from '@soulblade/shared'

// 맵별 배경 타일 설정
const TILE_THEMES: Record<MapId, {
  baseColor: string
  accentColor: string
  pattern: 'grass' | 'stone' | 'ice' | 'lava'
}> = {
  town: { baseColor: '#2a3a2a', accentColor: '#3a4a3a', pattern: 'grass' },
  serpent_forest: { baseColor: '#1a2e1a', accentColor: '#2a3e2a', pattern: 'grass' },
  ice_cave: { baseColor: '#1a2e3e', accentColor: '#2a3e4e', pattern: 'ice' },
  flame_castle: { baseColor: '#3e1a1a', accentColor: '#4e2a2a', pattern: 'lava' },
}

const TILE_SIZE = 64 // 각 타일 텍스처 픽셀 크기

// 프로시저럴 타일 텍스처 생성
const createTileTexture = (mapId: MapId): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const ctx = canvas.getContext('2d')!
  const theme = TILE_THEMES[mapId]

  // 베이스 색상 채우기
  ctx.fillStyle = theme.baseColor
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)

  // 패턴별 디테일
  switch (theme.pattern) {
    case 'grass': {
      // 잔디 점 패턴
      ctx.fillStyle = theme.accentColor
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(i * 37.1) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 53.7) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 2, 3)
      }
      break
    }
    case 'ice': {
      // 얼음 결정 패턴
      ctx.strokeStyle = theme.accentColor
      ctx.lineWidth = 0.5
      for (let i = 0; i < 8; i++) {
        const x = (Math.sin(i * 41.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 67.9) * 0.5 + 0.5) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x - 4, y)
        ctx.lineTo(x + 4, y)
        ctx.moveTo(x, y - 4)
        ctx.lineTo(x, y + 4)
        ctx.stroke()
      }
      // 반짝이는 점
      ctx.fillStyle = '#5588aa'
      for (let i = 0; i < 5; i++) {
        const x = (Math.sin(i * 23.7) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 31.3) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 1, 1)
      }
      break
    }
    case 'lava': {
      // 용암 균열 패턴
      ctx.strokeStyle = '#661111'
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const x1 = (Math.sin(i * 19.7) * 0.5 + 0.5) * TILE_SIZE
        const y1 = (Math.cos(i * 29.3) * 0.5 + 0.5) * TILE_SIZE
        const x2 = x1 + (Math.sin(i * 47.1) * 0.3) * TILE_SIZE
        const y2 = y1 + (Math.cos(i * 37.3) * 0.3) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      // 열기 점
      ctx.fillStyle = '#553322'
      for (let i = 0; i < 10; i++) {
        const x = (Math.sin(i * 43.1) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 59.7) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 2, 2)
      }
      break
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter

  return texture
}

interface BackgroundTileProps {
  mapId: MapId
  worldWidth: number
  worldHeight: number
}

// 와이드스크린/울트라와이드에서 보이는 영역 커버를 위한 여유 확장
const BG_EXTEND = 3000

export const BackgroundTile = ({ mapId, worldWidth, worldHeight }: BackgroundTileProps) => {
  const bgW = worldWidth + BG_EXTEND
  const bgH = worldHeight + BG_EXTEND

  const texture = useMemo(() => {
    const tex = createTileTexture(mapId)
    tex.repeat.set(bgW / TILE_SIZE, bgH / TILE_SIZE)
    return tex
  }, [mapId, bgW, bgH])

  // 맵 전환 시 이전 texture GPU 메모리 해제
  useEffect(() => {
    return () => texture.dispose()
  }, [texture])

  return (
    <mesh position={[worldWidth / 2, -0.2, worldHeight / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[bgW, bgH]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}
