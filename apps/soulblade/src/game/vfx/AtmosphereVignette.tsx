/**
 * 맵별 분위기 비네팅
 * 화면 가장자리에 컬러 tint 오버레이
 *
 * 셰이더 대신 CSS overlay 방식 (R3F Canvas 바깥)
 * → 성능 영향 최소, 맵별 색상만 교체
 *
 * LOD: full/reduced → 활성, minimal/canvas → 비활성
 */

import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh, ShaderMaterial } from 'three'
import { Color } from 'three'
import type { MapId } from '@soulblade/shared'

// 맵별 분위기 설정
const ATMOSPHERE_CONFIG: Record<MapId, {
  tint: string
  alpha: number
}> = {
  town: { tint: '#ffcc88', alpha: 0.12 },
  serpent_forest: { tint: '#33aa44', alpha: 0.2 },
  ice_cave: { tint: '#4488cc', alpha: 0.2 },
  flame_castle: { tint: '#ff4422', alpha: 0.15 },
}

// 비네팅 셰이더
const vignetteVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const vignetteFragmentShader = `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying vec2 vUv;

  void main() {
    // 중심으로부터 거리 (0=중심, 1=모서리)
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    // 비네팅 강도: 가장자리에서 강하게
    float vignette = smoothstep(0.3, 1.2, dist);

    gl_FragColor = vec4(uColor, vignette * uAlpha);
  }
`

interface AtmosphereVignetteProps {
  mapId: MapId
  enabled: boolean
}

export const AtmosphereVignette = ({ mapId, enabled }: AtmosphereVignetteProps) => {
  const meshRef = useRef<Mesh>(null)
  const matRef = useRef<ShaderMaterial>(null)
  const { camera } = useThree()
  const config = ATMOSPHERE_CONFIG[mapId]

  const uniforms = useMemo(() => ({
    uColor: { value: new Color(config.tint) },
    uAlpha: { value: config.alpha },
  }), [config.tint, config.alpha])

  // 카메라를 따라 이동 (화면 고정)
  useFrame(() => {
    if (!meshRef.current || !enabled) return
    meshRef.current.position.x = camera.position.x
    meshRef.current.position.y = camera.position.y

    // 맵 변경 시 uniform 업데이트
    if (matRef.current) {
      matRef.current.uniforms.uColor!.value.set(config.tint)
      matRef.current.uniforms.uAlpha!.value = config.alpha
    }
  })

  if (!enabled) return null

  return (
    <mesh ref={meshRef} position={[0, 0, 50]} renderOrder={900}>
      <planeGeometry args={[1200, 2000]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vignetteVertexShader}
        fragmentShader={vignetteFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
