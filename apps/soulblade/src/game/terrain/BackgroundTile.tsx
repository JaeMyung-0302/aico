/**
 * 배경 타일 렌더링
 * CanvasTexture로 프로시저럴 패턴 생성 + RepeatWrapping
 *
 * 맵별 고유 배경 패턴 (잔디/돌/얼음/용암 텍스처)
 * TerrainMesh 아래 Y=-2 레이어에 배치
 */

import { useEffect, useMemo, useState } from 'react'
import { CanvasTexture, RepeatWrapping, LinearFilter } from 'three'
import type { Texture } from 'three'
import type { MapId } from '@soulblade/shared'
import { loadBackgroundTexture } from '../assets/sprite-loader'

// 맵별 배경 타일 설정
const TILE_THEMES: Record<MapId, {
  baseColor: string
  accentColor: string
  pattern: 'grass' | 'forest' | 'stone' | 'ice' | 'lava'
}> = {
  town: { baseColor: '#243524', accentColor: '#3a5a3a', pattern: 'grass' },
  serpent_forest: { baseColor: '#1a2e1a', accentColor: '#2a5a2a', pattern: 'forest' },
  ice_cave: { baseColor: '#162838', accentColor: '#2a4050', pattern: 'ice' },
  flame_castle: { baseColor: '#381414', accentColor: '#502828', pattern: 'lava' },
}

const TILE_SIZE = 512 // 각 타일 텍스처 픽셀 크기 (512px = 고해상도 디테일)

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

  // 패턴별 디테일 (512px에 맞게 밀도/크기 스케일)
  switch (theme.pattern) {
    case 'grass': {
      // 잔디 1층: 풀잎 (밀도 4배)
      ctx.fillStyle = theme.accentColor
      for (let i = 0; i < 240; i++) {
        const x = (Math.sin(i * 37.1) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 53.7) * 0.5 + 0.5) * TILE_SIZE
        const h = 6 + (Math.sin(i * 11.3) * 0.5 + 0.5) * 12
        ctx.fillRect(x, y, 4, h)
      }
      // 잔디 2층: 밝은 풀잎 (깊이감)
      const midColor = theme.baseColor.replace(/[0-9a-f]{2}$/i, (m) =>
        Math.min(255, parseInt(m, 16) + 20).toString(16).padStart(2, '0'))
      ctx.fillStyle = midColor
      for (let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 71.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 43.9) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 3, 10)
      }
      // 잔디 3층: 어두운 풀잎 (그림자 깊이)
      ctx.fillStyle = '#1a3018'
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 97.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 61.7) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 3, 8)
      }
      // 흙 패치 (변화감, 더 크게)
      ctx.fillStyle = '#1e2a1a'
      for (let i = 0; i < 12; i++) {
        const x = (Math.sin(i * 89.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 67.1) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 16, 12)
      }
      // 작은 돌 (텍스처 변화)
      ctx.fillStyle = '#4a5a48'
      for (let i = 0; i < 8; i++) {
        const x = (Math.sin(i * 53.1) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 79.3) * 0.5 + 0.5) * TILE_SIZE
        ctx.beginPath()
        ctx.ellipse(x, y, 4 + Math.sin(i * 3.7) * 2, 3 + Math.cos(i * 2.1) * 1.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'forest': {
      // 어두운 숲 바닥 — 다층 레이어
      // 1층: 이끼 패치 (불규칙한 초록 블롭)
      ctx.fillStyle = '#2a4a28'
      for (let i = 0; i < 80; i++) {
        const x = (Math.sin(i * 29.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 41.7) * 0.5 + 0.5) * TILE_SIZE
        const w = 8 + Math.sin(i * 7.1) * 6
        const h = 6 + Math.cos(i * 5.3) * 4
        ctx.fillRect(x, y, w, h)
      }
      // 2층: 낙엽/부식토 (갈색 패치)
      ctx.fillStyle = '#2e2a1e'
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 67.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 83.1) * 0.5 + 0.5) * TILE_SIZE
        const w = 10 + Math.sin(i * 13.7) * 8
        const h = 8 + Math.cos(i * 9.1) * 6
        ctx.fillRect(x, y, w, h)
      }
      // 3층: 뿌리 선 (어두운 선)
      ctx.strokeStyle = '#1a2518'
      ctx.lineWidth = 2
      for (let i = 0; i < 25; i++) {
        const x1 = (Math.sin(i * 37.1) * 0.5 + 0.5) * TILE_SIZE
        const y1 = (Math.cos(i * 53.3) * 0.5 + 0.5) * TILE_SIZE
        const x2 = x1 + (Math.sin(i * 19.7) * 0.12) * TILE_SIZE
        const y2 = y1 + (Math.cos(i * 23.1) * 0.12) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.quadraticCurveTo(x1 + 20, y1 + 15, x2, y2)
        ctx.stroke()
      }
      // 4층: 밝은 이끼 하이라이트
      ctx.fillStyle = theme.accentColor
      for (let i = 0; i < 120; i++) {
        const x = (Math.sin(i * 47.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 59.7) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 3, 6 + Math.sin(i * 11.3) * 4)
      }
      // 5층: 어두운 토양 패치
      ctx.fillStyle = '#1d261a'
      for (let i = 0; i < 15; i++) {
        const x = (Math.sin(i * 89.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 67.1) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 18, 14)
      }
      // 6층: 물웅덩이 반사 (어두운 파란 타원)
      ctx.fillStyle = '#1a2a30'
      for (let i = 0; i < 6; i++) {
        const x = (Math.sin(i * 101.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 79.7) * 0.5 + 0.5) * TILE_SIZE
        ctx.beginPath()
        ctx.ellipse(x, y, 12 + Math.sin(i * 3.1) * 6, 8 + Math.cos(i * 2.7) * 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'ice': {
      // 얼음 결정 패턴 (4배 밀도, 4배 크기)
      ctx.strokeStyle = theme.accentColor
      ctx.lineWidth = 1.5
      for (let i = 0; i < 48; i++) {
        const x = (Math.sin(i * 41.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 67.9) * 0.5 + 0.5) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x - 16, y)
        ctx.lineTo(x + 16, y)
        ctx.moveTo(x, y - 16)
        ctx.lineTo(x, y + 16)
        ctx.moveTo(x - 10, y - 10)
        ctx.lineTo(x + 10, y + 10)
        ctx.stroke()
      }
      // 반짝이는 점 (4배 밀도)
      ctx.fillStyle = '#6699bb'
      for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 23.7) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 31.3) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 5, 5)
      }
      // 얼음 균열
      ctx.strokeStyle = '#3a6080'
      ctx.lineWidth = 0.8
      for (let i = 0; i < 20; i++) {
        const x1 = (Math.sin(i * 33.7) * 0.5 + 0.5) * TILE_SIZE
        const y1 = (Math.cos(i * 47.3) * 0.5 + 0.5) * TILE_SIZE
        const x2 = x1 + (Math.sin(i * 17.1) * 0.15) * TILE_SIZE
        const y2 = y1 + (Math.cos(i * 23.7) * 0.15) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      break
    }
    case 'lava': {
      // 용암 균열 패턴 (4배 밀도/크기)
      ctx.strokeStyle = '#661111'
      ctx.lineWidth = 4
      for (let i = 0; i < 30; i++) {
        const x1 = (Math.sin(i * 19.7) * 0.5 + 0.5) * TILE_SIZE
        const y1 = (Math.cos(i * 29.3) * 0.5 + 0.5) * TILE_SIZE
        const x2 = x1 + (Math.sin(i * 47.1) * 0.3) * TILE_SIZE
        const y2 = y1 + (Math.cos(i * 37.3) * 0.3) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      // 밝은 용암 균열 글로우
      ctx.strokeStyle = '#993322'
      ctx.lineWidth = 2
      for (let i = 0; i < 15; i++) {
        const x1 = (Math.sin(i * 41.7) * 0.5 + 0.5) * TILE_SIZE
        const y1 = (Math.cos(i * 53.3) * 0.5 + 0.5) * TILE_SIZE
        const x2 = x1 + (Math.sin(i * 31.1) * 0.2) * TILE_SIZE
        const y2 = y1 + (Math.cos(i * 27.3) * 0.2) * TILE_SIZE
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      // 열기 점 (더 크게)
      ctx.fillStyle = '#664433'
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(i * 43.1) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 59.7) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 8, 8)
      }
      // 밝은 용암 빛 점
      ctx.fillStyle = '#883322'
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(i * 77.3) * 0.5 + 0.5) * TILE_SIZE
        const y = (Math.cos(i * 83.1) * 0.5 + 0.5) * TILE_SIZE
        ctx.fillRect(x, y, 12, 12)
      }
      break
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter

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

  // 프로시저럴 텍스처 (즉시 렌더)
  const proceduralTexture = useMemo(() => {
    const tex = createTileTexture(mapId)
    tex.repeat.set(bgW / TILE_SIZE, bgH / TILE_SIZE)
    return tex
  }, [mapId, bgW, bgH])

  // 이미지 텍스처 (비동기 로드, 성공 시 교체)
  const [imageTexture, setImageTexture] = useState<Texture | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBackgroundTexture(mapId).then((tex) => {
      if (!tex) return
      if (cancelled) { tex.dispose(); return }
      tex.repeat.set(bgW / TILE_SIZE, bgH / TILE_SIZE)
      setImageTexture(tex)
    })
    return () => {
      cancelled = true
      setImageTexture((prev) => { prev?.dispose(); return null })
    }
  }, [mapId, bgW, bgH])

  const texture = imageTexture ?? proceduralTexture

  // 맵 전환 시 이전 procedural texture GPU 메모리 해제
  useEffect(() => {
    return () => proceduralTexture.dispose()
  }, [proceduralTexture])

  return (
    <mesh position={[worldWidth / 2, -2, worldHeight / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[bgW, bgH]} />
      <meshBasicMaterial map={texture} depthWrite={false} />
    </mesh>
  )
}
