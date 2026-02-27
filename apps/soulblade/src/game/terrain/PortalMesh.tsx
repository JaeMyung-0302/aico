/**
 * 포탈 3D 메시 렌더링
 * TorusGeometry + 회전 애니메이션 + emissive 글로우
 *
 * 맵별 포탈 위치/크기는 WorldMapConfig.portals에서 읽음
 * 충돌 감지는 map-r3f.ts에서 처리
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import type { PortalConfig } from '@soulblade/shared'

// 포탈 색상 (목적지별)
const PORTAL_COLORS: Record<string, string> = {
  serpent_forest: '#44ff66',
  ice_cave: '#4488ff',
  flame_castle: '#ff4422',
  town: '#ffdd44',
}

const PortalItem = ({ portal }: { portal: PortalConfig }) => {
  const groupRef = useRef<Group>(null)
  const innerRef = useRef<Mesh>(null)

  const color = PORTAL_COLORS[portal.targetMapId] ?? '#ffffff'
  const radius = Math.max(portal.size.width, portal.size.height) / 2

  // 회전 애니메이션
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.5
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 2.5
    }
  })

  return (
    <group position={[portal.position.x, 3, portal.position.y]}>
      {/* 외부 링 (천천히 회전) */}
      <group ref={groupRef}>
        <mesh>
          <torusGeometry args={[radius, 3, 8, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>

      {/* 내부 링 (빠르게 역방향 회전) */}
      <mesh ref={innerRef}>
        <torusGeometry args={[radius * 0.6, 2, 6, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* 중심 글로우 (포인트 라이트 대체) */}
      <mesh>
        <circleGeometry args={[radius * 0.4, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

interface PortalMeshProps {
  portals: readonly PortalConfig[]
}

export const PortalMesh = ({ portals }: PortalMeshProps) => {
  return (
    <group>
      {portals.map((portal) => (
        <PortalItem key={portal.id} portal={portal} />
      ))}
    </group>
  )
}
