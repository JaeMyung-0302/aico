/**
 * 맵 장애물 3D 메시 렌더링
 * ObstacleConfig[] → Three.js 기하학 변환
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * type 매핑:
 * - rect → BoxGeometry
 * - circle → CylinderGeometry (원통)
 * - triangle → ConeGeometry (원뿔)
 * - ellipse → CylinderGeometry (타원형 실린더)
 *
 * collidable 장애물은 map-r3f.ts에서 AABB 충돌 처리
 * 여기서는 렌더링만 담당
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import type { Mesh } from 'three'
import type { ObstacleConfig } from '@soulblade/shared'
import { useObstacleTextures } from '../assets/sprite-loader'
import { OBSTACLE_SPRITE_ASSETS } from '../assets/sprite-config'

interface ObstaclesMeshProps {
  obstacles: readonly ObstacleConfig[]
}

// 단일 장애물 렌더링
const ObstacleItem = ({ obs }: { obs: ObstacleConfig }) => {
  const color = useMemo(() => new Color(obs.color), [obs.color])
  const alpha = obs.alpha ?? 0.6
  const obstacleType = obs.type ?? 'rect'

  // 공통 위치 (게임 XY → Three.js XZ)
  const posX = obs.x
  const posZ = obs.y

  // 3D 높이: collidable이면 약간 돌출, 아니면 거의 평면
  const height3d = obs.collidable !== false ? 3 : 1

  switch (obstacleType) {
    case 'rect': {
      return (
        <mesh
          position={[posX, height3d / 2, posZ]}
          castShadow={obs.collidable !== false}
        >
          <boxGeometry args={[obs.width, height3d, obs.height]} />
          <meshLambertMaterial
            color={color}
            transparent={alpha < 1}
            opacity={alpha}
          />
        </mesh>
      )
    }
    case 'circle': {
      const radius = obs.radius ?? obs.width / 2
      return (
        <mesh
          position={[posX, height3d / 2, posZ]}
          castShadow={obs.collidable !== false}
        >
          <cylinderGeometry args={[radius, radius, height3d, 12]} />
          <meshLambertMaterial
            color={color}
            transparent={alpha < 1}
            opacity={alpha}
          />
        </mesh>
      )
    }
    case 'triangle': {
      const radius = Math.max(obs.width, obs.height) / 2
      return (
        <mesh
          position={[posX, height3d / 2, posZ]}
          castShadow={obs.collidable !== false}
        >
          <coneGeometry args={[radius, height3d, 6]} />
          <meshLambertMaterial
            color={color}
            transparent={alpha < 1}
            opacity={alpha}
          />
        </mesh>
      )
    }
    case 'ellipse': {
      const radiusX = obs.width / 2
      const radiusY = obs.height / 2
      return (
        <mesh
          position={[posX, height3d / 2, posZ]}
          scale={[radiusX / radiusY, 1, 1]}
          castShadow={obs.collidable !== false}
        >
          <cylinderGeometry args={[radiusY, radiusY, height3d, 12]} />
          <meshLambertMaterial
            color={color}
            transparent={alpha < 1}
            opacity={alpha}
          />
        </mesh>
      )
    }
  }
}

// 스프라이트 빌보드 장애물 (spriteType이 있고 텍스처 로드됨)
const ObstacleBillboard = ({
  obs,
  textures,
}: {
  obs: ObstacleConfig
  textures: Record<string, import('three').Texture>
}) => {
  const meshRef = useRef<Mesh>(null)
  const spriteType = obs.spriteType!
  const tex = textures[spriteType]
  const config = OBSTACLE_SPRITE_ASSETS[spriteType]

  // useFrame은 항상 호출 (Rules of Hooks)
  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.quaternion.copy(state.camera.quaternion)
  })

  if (!tex || !config) return null

  const halfH = config.frameHeight / 2

  return (
    <mesh ref={meshRef} position={[obs.x, halfH, obs.y]}>
      <planeGeometry args={[config.frameWidth, config.frameHeight]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.1} />
    </mesh>
  )
}

export const ObstaclesMesh = ({ obstacles }: ObstaclesMeshProps) => {
  const spriteTypes = useMemo(
    () => obstacles.map((o) => o.spriteType).filter((s): s is string => !!s),
    [obstacles],
  )
  const { textures, loaded } = useObstacleTextures(spriteTypes)

  return (
    <group>
      {obstacles.map((obs, i) => {
        // spriteType이 있고 텍스처 로드됨 → 빌보드
        if (obs.spriteType && loaded && textures[obs.spriteType]) {
          return <ObstacleBillboard key={i} obs={obs} textures={textures} />
        }
        // 폴백: 기존 3D 프리미티브
        return <ObstacleItem key={i} obs={obs} />
      })}
    </group>
  )
}
