/**
 * 맵별 조명 리그
 * AmbientLight + DirectionalLight 조합으로 씬 조명
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * LOD 연동: full/reduced → 그림자 활성, minimal/canvas → 비활성
 * 맵별 색온도: town=따뜻, forest=녹색, ice=파랑, flame=붉은빛
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { DirectionalLight } from 'three'
import type { MapId } from '@soulblade/shared'

// 맵별 조명 테마 (3D 좌표계: [X오프셋, Y높이, Z오프셋])
const LIGHTING_THEMES: Record<MapId, {
  ambientColor: number
  ambientIntensity: number
  dirColor: number
  dirIntensity: number
  dirPosition: [number, number, number]
}> = {
  town: {
    ambientColor: 0xfff4e0,
    ambientIntensity: 0.35,
    dirColor: 0xffeecc,
    dirIntensity: 0.85,
    dirPosition: [200, 300, -100],
  },
  serpent_forest: {
    ambientColor: 0x88cc88,
    ambientIntensity: 0.2,
    dirColor: 0x44aa44,
    dirIntensity: 0.55,
    dirPosition: [100, 250, -200],
  },
  ice_cave: {
    ambientColor: 0xaaccff,
    ambientIntensity: 0.25,
    dirColor: 0x6688cc,
    dirIntensity: 0.65,
    dirPosition: [0, 350, -50],
  },
  flame_castle: {
    ambientColor: 0xff8844,
    ambientIntensity: 0.2,
    dirColor: 0xff4422,
    dirIntensity: 0.8,
    dirPosition: [150, 200, -150],
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
    const cz = camera.position.z
    light.position.set(
      cx + theme.dirPosition[0],
      theme.dirPosition[1],
      cz + theme.dirPosition[2],
    )
    light.target.position.set(cx, 0, cz)
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
