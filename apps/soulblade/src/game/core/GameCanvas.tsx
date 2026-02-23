/**
 * R3F Canvas 래퍼
 * Phaser.Game 인스턴스를 대체하는 React Three Fiber Canvas
 *
 * OrthographicCamera: 540×960 뷰포트 (원본 게임 좌표계 유지)
 * 좌표계: 게임 로직은 Y-down (Phaser 호환), 렌더링 시 Y 반전
 */

// Three.js r171+에서 Clock deprecated → Timer 전환 경고 억제
// R3F v9가 내부적으로 Clock을 사용하므로 R3F 업데이트 전까지 필요
const _origWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return
  _origWarn.apply(console, args)
}

import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useState } from 'react'
import { PCFShadowMap } from 'three'
import type { RootState } from '@react-three/fiber'
import type { CharacterClass, CharacterStats, MapId } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { GameLoop } from './GameLoop'
import { CameraRig } from './CameraRig'
import { Player3D } from '../components/Player3D'
import { Monster3D } from '../components/Monster3D'
import { Elite3D } from '../components/Elite3D'
import { Projectile3D } from '../components/Projectile3D'
import { Boss3D } from '../components/Boss3D'
import { PlayerBillboard } from '../components/PlayerBillboard'
import { MonsterBillboard } from '../components/MonsterBillboard'
import { EliteBillboard } from '../components/EliteBillboard'
import { ProjectileBillboard } from '../components/ProjectileBillboard'
import { HpBarOverlay } from '../components/HpBarOverlay'
import { DamageNumbers } from '../components/DamageNumbers'
import { MapScene } from '../terrain/MapScene'
import { VFXManager } from '../vfx/VFXManager'
import { LightingRig } from '../lighting/LightingRig'
import { DynamicLights } from '../lighting/DynamicLights'
import { PostProcessing } from '../lighting/PostProcessing'
import { useEntityStore } from '../stores/useEntityStore'
import { useLodStore } from '../stores/useLodStore'
import { getLodConfig } from '../systems/lod'
import { MAP_CONFIGS } from '../data/maps'
import { initAudioR3F, playBgmR3F, stopBgmR3F } from '../systems/audio-r3f'

// 그림자 초기화 (Canvas shadows prop 대신 직접 설정)
const handleCreated = (state: RootState) => {
  const { gl } = state
  gl.shadowMap.enabled = true
  gl.shadowMap.type = PCFShadowMap
}

// R3F Canvas 외부의 React 이벤트 리스너 (game:start 등)
const GameEventHandler = ({ onMapChange }: { onMapChange: (mapId: MapId) => void }) => {
  useEffect(() => {
    initAudioR3F()

    const onGameStart = (data: {
      mapId: MapId
      classType: CharacterClass
      stats: Partial<CharacterStats>
      equippedItems: ReadonlyArray<unknown>
      characterName?: string
    }) => {
      // 기존 엔티티 초기화
      useEntityStore.getState().clearAll()

      // 맵 설정에서 스폰 위치 사용
      const mapConfig = MAP_CONFIGS[data.mapId]
      const spawnX = mapConfig.playerSpawn.x
      const spawnY = mapConfig.playerSpawn.y

      // 플레이어 생성
      useEntityStore.getState().initPlayer(
        spawnX,
        spawnY,
        data.classType,
        data.stats,
        data.characterName,
      )

      // BGM 재생 + 맵 UI 업데이트
      playBgmR3F(data.mapId)
      onMapChange(data.mapId)
      eventBus.emit('hud:mapName', { name: mapConfig.name })

      // 초기 스탯 이벤트 발행
      const player = useEntityStore.getState().player
      if (player) {
        eventBus.emit('player:statsUpdate', {
          hp: player.hp,
          maxHp: player.maxHp,
          atk: player.atk,
          def: player.def,
          spd: player.spd,
          crit: player.crit,
          critDmg: player.critDmg,
          level: player.level,
          exp: player.exp,
          expToNext: player.expToNext,
        })
      }
    }

    // 포탈 확인 시 맵 전환
    const onPortalConfirm = (data: { targetMapId: string }) => {
      const mapId = data.targetMapId as MapId
      onMapChange(mapId)
      eventBus.emit('hud:mapName', { name: MAP_CONFIGS[mapId].name })
      playBgmR3F(mapId)
    }

    eventBus.on('game:start', onGameStart)
    eventBus.on('portal:confirm', onPortalConfirm)

    return () => {
      eventBus.off('game:start', onGameStart)
      eventBus.off('portal:confirm', onPortalConfirm)
      stopBgmR3F()
    }
  }, [onMapChange])

  return null
}

// LOD-aware 씬 컨텐츠 (Canvas 내부)
const SceneContents = ({ currentMapId }: { currentMapId: MapId }) => {
  const quality = useLodStore((s) => s.quality)
  const config = getLodConfig(quality)
  const mapConfig = MAP_CONFIGS[currentMapId]

  return (
    <>
      <LightingRig mapId={currentMapId} enabled={config.enableLighting} enableShadows={config.enableShadows} />
      <DynamicLights enabled={config.enableDynamicLights} />
      <MapScene mapId={currentMapId} />
      <VFXManager
        mapId={currentMapId}
        worldWidth={mapConfig.worldSize.width}
        worldHeight={mapConfig.worldSize.height}
        quality={quality}
      />
      {config.enable3DModels ? <Player3D key="player-3d" /> : <PlayerBillboard key="player-bb" />}
      {config.enable3DModels ? <Monster3D key="monster-3d" /> : <MonsterBillboard key="monster-bb" />}
      {config.enable3DModels ? <Elite3D key="elite-3d" /> : <EliteBillboard key="elite-bb" />}
      {config.enable3DModels ? <Projectile3D key="proj-3d" /> : <ProjectileBillboard key="proj-bb" />}
      <Boss3D />
      <HpBarOverlay />
      <DamageNumbers />
      <PostProcessing
        enableBloom={config.enableBloom}
        enableChromaticAberration={config.enableChromaticAberration}
      />
    </>
  )
}

export const GameCanvas = () => {
  const [currentMapId, setCurrentMapId] = useState<MapId>('town')

  const onMapChange = useCallback((mapId: MapId) => {
    setCurrentMapId(mapId)
  }, [])

  return (
    <Canvas
      camera={{
        position: [270, 300, 830],
        fov: 45,
        near: 0.1,
        far: 5000,
      }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
      onCreated={handleCreated}
      frameloop="always"
    >
      <GameEventHandler onMapChange={onMapChange} />
      <CameraRig mapId={currentMapId} />
      <GameLoop />
      <SceneContents currentMapId={currentMapId} />
    </Canvas>
  )
}
