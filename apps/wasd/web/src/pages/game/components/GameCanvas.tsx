import { useRef, useState, useEffect, useMemo } from 'react'
import type { GameState, TileMap, Position } from '@wasd/shared'
import { TILE_SIZE } from '@wasd/shared'
import type { EffectsState } from '@/game/types'
import { useCanvas } from '@/hooks/useCanvas'
import { renderFrame } from '@/game/renderer'
import { updateEffects } from '@/game/render-effects'
import {
  createInterpolationState,
  updateInterpolationState,
  getInterpolatedPosition,
  shouldResetInterpolation,
} from '@/game/interpolation'

const TOUCH_UI_HEIGHT = 160
const DT = 1 / 60

const isTouchDevice = 'ontouchstart' in globalThis

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max)

const calcCameraOffset = (
  playerPos: Position,
  viewportW: number,
  viewportH: number,
  mapW: number,
  mapH: number,
): Position => ({
  x: clamp(playerPos.x - viewportW / 2, 0, Math.max(0, mapW - viewportW)),
  y: clamp(playerPos.y - viewportH / 2, 0, Math.max(0, mapH - viewportH)),
})

interface GameCanvasProps {
  gameState: GameState
  tileMap: TileMap
  effectsRef: React.MutableRefObject<EffectsState>
}

const GameCanvas = ({ gameState, tileMap, effectsRef }: GameCanvasProps) => {
  const interpRef = useRef(createInterpolationState(gameState.position))
  const prevStateRef = useRef<GameState | null>(null)
  const collectedSetRef = useRef(new Set(gameState.collectedCoins))
  const gameStateRef = useRef(gameState)
  const tileMapRef = useRef(tileMap)

  const mapWidth = (tileMap[0]?.length ?? 0) * TILE_SIZE
  const mapHeight = tileMap.length * TILE_SIZE

  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  })

  useEffect(() => {
    if (!isTouchDevice) return
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { canvasWidth, canvasHeight } = useMemo(() => {
    if (!isTouchDevice) {
      return { canvasWidth: mapWidth, canvasHeight: mapHeight }
    }
    const vw = Math.min(viewport.w, mapWidth)
    const vh = Math.min(viewport.h - TOUCH_UI_HEIGHT, mapHeight)
    return { canvasWidth: vw, canvasHeight: vh }
  }, [mapWidth, mapHeight, viewport])

  useEffect(() => {
    if (shouldResetInterpolation(prevStateRef.current, gameState)) {
      interpRef.current = createInterpolationState(gameState.position)
    } else {
      interpRef.current = updateInterpolationState(
        interpRef.current,
        gameState.position,
      )
    }
    prevStateRef.current = gameState
    collectedSetRef.current = new Set(gameState.collectedCoins)
    gameStateRef.current = gameState
    tileMapRef.current = tileMap
  }, [gameState, tileMap])

  const canvasRef = useCanvas(
    (ctx) => {
      const state = gameStateRef.current
      const renderPosition = getInterpolatedPosition(
        interpRef.current,
        state.direction,
        state.moving,
      )

      const cameraOffset = isTouchDevice
        ? calcCameraOffset(
            renderPosition,
            canvasWidth,
            canvasHeight,
            mapWidth,
            mapHeight,
          )
        : { x: 0, y: 0 }

      // Update effects (particles physics, shake expiry)
      effectsRef.current = updateEffects(effectsRef.current, DT)

      const timestamp = performance.now()
      renderFrame(
        ctx,
        tileMapRef.current,
        state,
        renderPosition,
        collectedSetRef.current,
        cameraOffset,
        state.stage,
        timestamp,
        effectsRef.current,
      )
    },
    canvasWidth,
    canvasHeight,
  )

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  )
}

export default GameCanvas
