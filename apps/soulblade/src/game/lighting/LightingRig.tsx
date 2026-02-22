/**
 * 맵별 조명 리그
 * AmbientLight + DirectionalLight 조합으로 씬 조명
 *
 * 2.5D 깊이감 핵심: 앰비언트를 낮추고 디렉셔널을 높여
 * 건물 윗면(밝음)과 앞면(어두움) 간 명암 대비 극대화
 *
 * LOD 연동: full/reduced → 그림자 활성, minimal/canvas → 비활성
 * 맵별 색온도: town=따뜻, forest=녹색, ice=파랑, flame=붉은빛
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { DirectionalLight } from 'three'
import type { MapId } from '@soulblade/shared'

// 맵별 조명 테마 (앰비언트 ↓ 디렉셔널 ↑ = 면 간 명암 대비 극대화)
const LIGHTING_THEMES: Record<MapId, {
  ambientColor: number
  ambientIntensity: number
  dirColor: number
  dirIntensity: number
  dirPosition: [number, number, number] // 그림자 시 카메라 기준 오프셋으로도 사용
}> = {
  town: {
    ambientColor: 0xfff4e0,
    ambientIntensity: 0.35,
    dirColor: 0xffeecc,
    dirIntensity: 0.85,
    dirPosition: [200, -100, 300],
  },
  serpent_forest: {
    ambientColor: 0x88cc88,
    ambientIntensity: 0.2,
    dirColor: 0x44aa44,
    dirIntensity: 0.55,
    dirPosition: [100, -200, 250],
  },
  ice_cave: {
    ambientColor: 0xaaccff,
    ambientIntensity: 0.25,
    dirColor: 0x6688cc,
    dirIntensity: 0.65,
    dirPosition: [0, -50, 350],
  },
  flame_castle: {
    ambientColor: 0xff8844,
    ambientIntensity: 0.2,
    dirColor: 0xff4422,
    dirIntensity: 0.8,
    dirPosition: [150, -150, 200],
  },
}

interface LightingRigProps {
  mapId: MapId
  enabled: boolean
  enableShadows: boolean
}

export const LightingRig = ({ mapId, enabled, enableShadows }: LightingRigProps) => {
  const theme = useMemo(() => LIGHTING_THEMES[mapId], [mapId])
  const lightRef = useRef<DirectionalLight>(null)

  // 그림자 카메라 설정 + target을 씬에 추가
  useEffect(() => {
    const light = lightRef.current
    if (!light) return

    if (enableShadows) {
      light.castShadow = true
      light.shadow.mapSize.set(1024, 1024)
      light.shadow.camera.left = -800
      light.shadow.camera.right = 800
      light.shadow.camera.top = 800
      light.shadow.camera.bottom = -800
      light.shadow.camera.near = 50
      light.shadow.camera.far = 600
      light.shadow.camera.updateProjectionMatrix()
      // target을 씬 그래프에 추가해야 그림자 카메라가 올바르게 동작
      light.parent?.add(light.target)
    } else {
      light.castShadow = false
    }

    return () => {
      if (light.parent && enableShadows) {
        light.parent.remove(light.target)
      }
    }
  }, [enableShadows])

  // 그림자 카메라가 게임 카메라를 따라가도록 (큰 맵 대응)
  useFrame(({ camera }) => {
    const light = lightRef.current
    if (!light || !enableShadows) return

    const cx = camera.position.x
    const cy = camera.position.y
    light.position.set(
      cx + theme.dirPosition[0],
      cy + theme.dirPosition[1],
      theme.dirPosition[2],
    )
    light.target.position.set(cx, cy, 0)
    light.target.updateMatrixWorld()
  })

  if (!enabled) {
    return <ambientLight intensity={1} />
  }

  return (
    <group>
      <ambientLight color={theme.ambientColor} intensity={theme.ambientIntensity} />
      <directionalLight
        ref={lightRef}
        color={theme.dirColor}
        intensity={theme.dirIntensity}
        position={theme.dirPosition}
      />
    </group>
  )
}
