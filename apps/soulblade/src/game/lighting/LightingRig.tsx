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
// warm key + cool fill 구성으로 입체적 조명
const LIGHTING_THEMES: Record<MapId, {
  ambientColor: number
  ambientIntensity: number
  dirColor: number
  dirIntensity: number
  dirPosition: [number, number, number]
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  fillColor: number
  fillIntensity: number
  fillPosition: [number, number, number]
}> = {
  town: {
    ambientColor: 0xfff4e0,
    ambientIntensity: 0.2,
    dirColor: 0xffeecc,
    dirIntensity: 0.95,
    dirPosition: [200, 300, -100],
    hemiSky: 0xfff4e0,
    hemiGround: 0x3a5a3a,
    hemiIntensity: 0.15,
    fillColor: 0xaabbcc,
    fillIntensity: 0.2,
    fillPosition: [-150, 150, 100],
  },
  serpent_forest: {
    ambientColor: 0x88cc88,
    ambientIntensity: 0.12,
    dirColor: 0x44aa44,
    dirIntensity: 0.6,
    dirPosition: [100, 250, -200],
    hemiSky: 0x88cc88,
    hemiGround: 0x1a2e1a,
    hemiIntensity: 0.18,
    fillColor: 0x99bbaa,
    fillIntensity: 0.15,
    fillPosition: [-100, 200, 150],
  },
  ice_cave: {
    ambientColor: 0xaaccff,
    ambientIntensity: 0.15,
    dirColor: 0x6688cc,
    dirIntensity: 0.7,
    dirPosition: [0, 350, -50],
    hemiSky: 0xaaccff,
    hemiGround: 0x2a3a4a,
    hemiIntensity: 0.2,
    fillColor: 0x88aacc,
    fillIntensity: 0.18,
    fillPosition: [-100, 200, 100],
  },
  flame_castle: {
    ambientColor: 0xff8844,
    ambientIntensity: 0.12,
    dirColor: 0xff4422,
    dirIntensity: 0.9,
    dirPosition: [150, 200, -150],
    hemiSky: 0xff6633,
    hemiGround: 0x331111,
    hemiIntensity: 0.15,
    fillColor: 0xcc6644,
    fillIntensity: 0.15,
    fillPosition: [-120, 180, 100],
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
      light.shadow.mapSize.set(2048, 2048)
      light.shadow.camera.left = -800
      light.shadow.camera.right = 800
      light.shadow.camera.top = 800
      light.shadow.camera.bottom = -800
      light.shadow.camera.near = 50
      light.shadow.camera.far = 600
      light.shadow.bias = -0.001
      light.shadow.normalBias = 0.02
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
  // 텍셀 스냅핑: 섀도우 맵 텍셀 단위로 위치를 반올림하여 이동 시 격자 흔들림 방지
  useFrame(({ camera }) => {
    const light = lightRef.current
    if (!light || !enableShadows) return

    // 섀도우 프러스텀 = 1600 유닛, 맵 = 2048 텍셀 → 텍셀 크기
    const shadowFrustum = 1600
    const shadowMapSize = 2048
    const texelSize = shadowFrustum / shadowMapSize

    const cx = camera.position.x
    const cz = camera.position.z

    // 텍셀 그리드에 스냅 (sub-texel 이동 제거)
    const snappedX = Math.floor(cx / texelSize) * texelSize
    const snappedZ = Math.floor(cz / texelSize) * texelSize

    light.position.set(
      snappedX + theme.dirPosition[0],
      theme.dirPosition[1],
      snappedZ + theme.dirPosition[2],
    )
    light.target.position.set(snappedX, 0, snappedZ)
    light.target.updateMatrixWorld()
  })

  if (!enabled) {
    return <ambientLight intensity={1} />
  }

  return (
    <group>
      <ambientLight color={theme.ambientColor} intensity={theme.ambientIntensity} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, theme.hemiIntensity]} />
      <directionalLight
        ref={lightRef}
        color={theme.dirColor}
        intensity={theme.dirIntensity}
        position={theme.dirPosition}
      />
      {/* Fill light (그림자 없이 반대쪽 조명으로 대비 완화) */}
      <directionalLight
        color={theme.fillColor}
        intensity={theme.fillIntensity}
        position={theme.fillPosition}
      />
    </group>
  )
}
