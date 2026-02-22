/**
 * VFX 매니저 (퍼사드 컴포넌트)
 * 모든 VFX 서브시스템을 LOD 설정에 따라 조건부 렌더링
 *
 * LOD 연동:
 * - full: 모든 VFX 활성
 * - reduced: 그림자+패럴랙스+비네팅+글로우+전투이펙트(basic)
 * - minimal: 전투이펙트(basic)만
 * - canvas: 모든 VFX 비활성
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MapId } from '@soulblade/shared'
import type { QualityLevel } from '../systems/lod'
import { getLodConfig } from '../systems/lod'
import { ShadowSystem } from './ShadowSystem'
import { ParallaxLayers } from './ParallaxLayers'
import { AtmosphereVignette } from './AtmosphereVignette'
import { CombatEffects } from './CombatEffects'
import { AttackEffects } from './AttackEffects'
import { EnvironmentParticles } from './EnvironmentParticles'
import { EntityGlow } from './EntityGlow'

interface VFXManagerProps {
  mapId: MapId
  worldWidth: number
  worldHeight: number
  quality: QualityLevel
}

export const VFXManager = ({ mapId, worldWidth, worldHeight, quality }: VFXManagerProps) => {
  const config = getLodConfig(quality)

  return (
    <group>
      <ShadowSystem enabled={config.enableShadows} />

      <ParallaxLayers
        mapId={mapId}
        worldWidth={worldWidth}
        worldHeight={worldHeight}
        enabled={config.enableParallax}
        layerCount={config.parallaxLayers}
      />

      <AtmosphereVignette
        mapId={mapId}
        enabled={config.enableAtmosphere}
      />

      <CombatEffects effectLevel={config.combatEffectLevel} />

      <AttackEffects enabled={config.enableAttackAnim} />

      <EnvironmentParticles
        mapId={mapId}
        enabled={config.enableEnvironmentParticles}
      />

      <EntityGlow
        enableGlow={config.enableEntityGlow}
        enableBreath={config.enableBreathTween}
      />
    </group>
  )
}
