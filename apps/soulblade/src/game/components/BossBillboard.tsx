/**
 * 보스 빌보드 렌더링
 * AI 스프라이트 기반 빌보드 + BossPhase별 시각 피드백
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * 빌보딩: 카메라 quaternion 복사
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { Color } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { useSpriteTextures } from '../assets/sprite-loader'
import { ENTITY_SPRITE_ASSETS } from '../assets/sprite-config'

const MODEL_SCALE = 1.5
const SPRITE_W = ENTITY_SPRITE_ASSETS.boss.frameWidth * MODEL_SCALE
const SPRITE_H = ENTITY_SPRITE_ASSETS.boss.frameHeight * MODEL_SCALE
const SUMMON_COLOR = new Color(0.27, 0.13, 0.07) // warm glow

export const BossBillboard = () => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const animRef = useRef({ timer: 0 })

  const hasBoss = useEntityStore((s) => s.boss !== null)
  const { textures } = useSpriteTextures()

  const texture = useMemo(() => {
    const tex = textures.boss.clone()
    tex.needsUpdate = true
    return tex
  }, [textures])

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame((state, delta) => {
    const boss = useEntityStore.getState().boss
    if (!boss || !boss.active || !meshRef.current) return

    // 위치
    meshRef.current.position.set(boss.body.x, SPRITE_H / 2, boss.body.y)
    // 빌보딩
    meshRef.current.quaternion.copy(state.camera.quaternion)

    const anim = animRef.current
    anim.timer += delta

    // BossPhase 시각 피드백
    const mat = materialRef.current
    if (!mat) return

    switch (boss.currentPhase) {
      case 'chase':
        meshRef.current.scale.set(MODEL_SCALE, MODEL_SCALE, 1)
        mat.color.setRGB(1, 1, 1)
        break
      case 'charge':
        meshRef.current.scale.set(
          boss.isCharging ? MODEL_SCALE * 1.1 : MODEL_SCALE,
          MODEL_SCALE,
          1,
        )
        mat.color.setRGB(1, 0.9, 0.9)
        break
      case 'aoe': {
        const pulse = Math.sin(anim.timer * 10) * 0.08
        meshRef.current.scale.set(
          MODEL_SCALE * (1 + pulse),
          MODEL_SCALE * (1 + pulse),
          1,
        )
        mat.color.setRGB(1, 0.8, 0.7)
        break
      }
      case 'summon': {
        const glow = Math.sin(anim.timer * 6) * 0.3 + 0.7
        meshRef.current.scale.set(MODEL_SCALE, MODEL_SCALE, 1)
        mat.color.setRGB(
          glow + SUMMON_COLOR.r * 0.3,
          glow * 0.85 + SUMMON_COLOR.g * 0.3,
          glow * 0.7 + SUMMON_COLOR.b * 0.3,
        )
        break
      }
    }
  })

  if (!hasBoss) return null

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[SPRITE_W, SPRITE_H]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        alphaTest={0.1}
      />
    </mesh>
  )
}
