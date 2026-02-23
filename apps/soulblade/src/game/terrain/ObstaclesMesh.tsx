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

import { useMemo } from 'react'
import { Color } from 'three'
import type { ObstacleConfig } from '@soulblade/shared'

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

  switch (obstacleType) {
    case 'rect': {
      const height3d = obs.collidable !== false ? Math.min(obs.height * 0.4, 20) : 2
      return (
        <mesh position={[posX, height3d / 2, posZ]} castShadow={obs.collidable !== false}>
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
      const height3d = obs.collidable !== false ? Math.max(radius * 0.8, 10) : 3
      return (
        <mesh position={[posX, height3d / 2, posZ]} castShadow={obs.collidable !== false}>
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
      const height3d = obs.collidable !== false ? obs.height * 0.6 : obs.height * 0.3
      return (
        <mesh position={[posX, height3d / 2, posZ]} castShadow={obs.collidable !== false}>
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
      const height3d = obs.collidable !== false ? 8 : 2
      return (
        <mesh position={[posX, height3d / 2, posZ]} scale={[radiusX / radiusY, 1, 1]} castShadow={obs.collidable !== false}>
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

export const ObstaclesMesh = ({ obstacles }: ObstaclesMeshProps) => {
  return (
    <group>
      {obstacles.map((obs, i) => (
        <ObstacleItem key={i} obs={obs} />
      ))}
    </group>
  )
}
