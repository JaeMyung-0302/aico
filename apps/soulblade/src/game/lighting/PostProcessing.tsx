/**
 * 포스트프로세싱 이펙트
 * @react-three/postprocessing EffectComposer 활용
 *
 * - Bloom: 엘리트 글로우, 포탈 발광 강조
 * - ChromaticAberration: 피격 시 일시적 색수차
 *
 * LOD:
 * - full: Bloom + ChromaticAberration
 * - reduced: ChromaticAberration만
 * - minimal/canvas: 비활성
 */

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { eventBus } from '@/lib/event-bus'

const ABERRATION_DURATION = 300 // ms
const ABERRATION_MAX = 0.012

interface PostProcessingProps {
  enableBloom: boolean
  enableChromaticAberration: boolean
}

export const PostProcessing = ({ enableBloom, enableChromaticAberration }: PostProcessingProps) => {
  const offsetRef = useRef(new Vector2(0, 0))
  const aberrationState = useRef({ age: 0, active: false })

  // 피격 이벤트 → 색수차 트리거
  useEffect(() => {
    if (!enableChromaticAberration) return

    const onDamage = (data: { x: number; y: number; damage: number; isCrit: boolean; color?: string }) => {
      // 플레이어 피격 (빨간색 데미지)
      if (data.color === '#ff4444') {
        aberrationState.current.age = 0
        aberrationState.current.active = true
      }
    }

    eventBus.on('combat:damageNumber', onDamage)
    return () => {
      eventBus.off('combat:damageNumber', onDamage)
    }
  }, [enableChromaticAberration])

  // 색수차 애니메이션
  useFrame((_state, delta) => {
    if (!enableChromaticAberration) return
    const state = aberrationState.current

    if (state.active) {
      state.age += delta * 1000
      if (state.age >= ABERRATION_DURATION) {
        state.active = false
        offsetRef.current.set(0, 0)
      } else {
        const progress = state.age / ABERRATION_DURATION
        const intensity = ABERRATION_MAX * (1 - progress)
        offsetRef.current.set(intensity, intensity)
      }
    }
  })

  if (!enableBloom && !enableChromaticAberration) return null

  // 단일 EffectComposer 유지 — LOD 전환 시 GPU 리소스 재할당 방지
  // 비활성 이펙트는 intensity=0 / offset=0으로 no-op 처리
  return (
    <EffectComposer enabled multisampling={0}>
      <Bloom
        intensity={enableBloom ? 0.65 : 0}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <ChromaticAberration
        offset={offsetRef.current}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  )
}
