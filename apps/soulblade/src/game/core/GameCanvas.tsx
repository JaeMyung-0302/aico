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
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { GameLoop } from './GameLoop'
import { CameraController } from './CameraController'
import { Player3D } from '../components/Player3D'
import { Monster3D } from '../components/Monster3D'
import { Elite3D } from '../components/Elite3D'
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

// 2.5D 카메라 기울기 (~34°)
const CAMERA_TILT = 0.6
// 카메라 Z 높이: 기울기에서 모든 게임 오브젝트가 근평면 앞에 위치하도록
// Z=100이면 화면 상단 ~30%가 카메라 뒤(근평면 밖)에 놓여 렌더링 안됨
const CAMERA_Z = 400
const TILT_Y_OFFSET = CAMERA_Z * Math.tan(CAMERA_TILT)

// 캔버스 리사이즈 시 카메라 줌 조정 (FIT 스케일링)
const handleCreated = (state: RootState) => {
  const { gl, camera, size } = state
  // 그림자: Canvas shadows prop 대신 직접 설정 (PCFSoftShadowMap deprecated 경고 방지)
  gl.shadowMap.enabled = true
  gl.shadowMap.type = PCFShadowMap
  const scaleX = size.width / VIEWPORT_WIDTH
  const scaleY = size.height / VIEWPORT_HEIGHT
  camera.zoom = Math.min(scaleX, scaleY)
  // 2.5D 기울기 적용 (R3F 기본 lookAt(0,0,0) 오버라이드)
  camera.rotation.set(-CAMERA_TILT, 0, 0)
  // 기울기 보정 Y 오프셋
  camera.position.y += TILT_Y_OFFSET
  camera.updateProjectionMatrix()
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
      <Player3D />
      <Monster3D />
      <Elite3D />
      <ProjectileBillboard />
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

  const onCreated = useCallback((state: RootState) => {
    handleCreated(state)
  }, [])

  const onMapChange = useCallback((mapId: MapId) => {
    setCurrentMapId(mapId)
  }, [])

  return (
    <Canvas
      orthographic
      camera={{
        position: [VIEWPORT_WIDTH / 2, -VIEWPORT_HEIGHT / 2, CAMERA_Z],
        near: 0.1,
        far: 1000,
        zoom: 1,
      }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
      onCreated={onCreated}
      frameloop="always"
    >
      <GameEventHandler onMapChange={onMapChange} />
      <CameraController mapId={currentMapId} />
      <GameLoop />
      <SceneContents currentMapId={currentMapId} />
    </Canvas>
  )
}
