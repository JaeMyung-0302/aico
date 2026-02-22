/**
 * NPC 3D 메시 렌더링
 * BoxGeometry 기반 프로시저럴 건물/석상
 *
 * NPC 타입별 외형:
 * - shop: 상점 건물 (지붕 + 진열대 + 따뜻한 조명)
 * - blacksmith: 대장간 (굴뚝 + 모루 + 불빛)
 * - portal_guide: 석상 기둥 + 빛 이펙트
 *
 * 충돌/상호작용 감지는 map-r3f.ts에서 처리
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import type { NpcConfig } from '@soulblade/shared'

// 상점 NPC
const ShopMesh = ({ npc }: { npc: NpcConfig }) => {
  const posX = npc.position.x
  const posY = -npc.position.y

  return (
    <group position={[posX, posY, 0]}>
      {/* 건물 본체 */}
      <mesh position={[0, 0, 15]} castShadow>
        <boxGeometry args={[48, 40, 30]} />
        <meshLambertMaterial color="#8b7355" />
      </mesh>

      {/* 지붕 (삼각형) */}
      <mesh position={[0, 0, 33]} castShadow>
        <coneGeometry args={[32, 14, 4]} />
        <meshLambertMaterial color="#aa4444" />
      </mesh>

      {/* 창문 (따뜻한 빛 — meshBasicMaterial: 발광) */}
      <mesh position={[0, -21, 12]}>
        <planeGeometry args={[16, 12]} />
        <meshBasicMaterial color="#ffdd88" />
      </mesh>

      {/* 진열대 */}
      <mesh position={[0, -22, 5]}>
        <boxGeometry args={[30, 6, 8]} />
        <meshLambertMaterial color="#6b5335" />
      </mesh>
    </group>
  )
}

// 대장간 NPC
const BlacksmithMesh = ({ npc }: { npc: NpcConfig }) => {
  const posX = npc.position.x
  const posY = -npc.position.y
  const glowRef = useRef<Mesh>(null)
  const elapsedRef = useRef(0)

  // 화로 깜빡임 효과
  useFrame((_state, delta) => {
    const mat = glowRef.current?.material as MeshBasicMaterial | undefined
    if (mat) {
      elapsedRef.current += delta
      const t = elapsedRef.current
      mat.opacity = 0.6 + Math.sin(t * 5) * 0.15 + Math.sin(t * 8.3) * 0.1
    }
  })

  return (
    <group position={[posX, posY, 0]}>
      {/* 건물 본체 */}
      <mesh position={[0, 0, 15]} castShadow>
        <boxGeometry args={[50, 44, 30]} />
        <meshLambertMaterial color="#666666" />
      </mesh>

      {/* 굴뚝 */}
      <mesh position={[16, 0, 35]} castShadow>
        <boxGeometry args={[10, 10, 16]} />
        <meshLambertMaterial color="#555555" />
      </mesh>

      {/* 모루 */}
      <mesh position={[-10, -24, 5]}>
        <boxGeometry args={[14, 8, 10]} />
        <meshLambertMaterial color="#444444" />
      </mesh>

      {/* 화로 불빛 */}
      <mesh ref={glowRef} position={[10, -24, 8]}>
        <circleGeometry args={[8, 12]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}

// 포탈 가이드 (석상) NPC
const PortalGuideMesh = ({ npc }: { npc: NpcConfig }) => {
  const posX = npc.position.x
  const posY = -npc.position.y
  const lightRef = useRef<Mesh>(null)
  const elapsedRef = useRef(0)

  // 빛 맥동 효과
  useFrame((_state, delta) => {
    const mat = lightRef.current?.material as MeshBasicMaterial | undefined
    if (mat) {
      elapsedRef.current += delta
      const t = elapsedRef.current
      mat.opacity = 0.4 + Math.sin(t * 2) * 0.3
    }
  })

  return (
    <group position={[posX, posY, 0]}>
      {/* 기둥 */}
      <mesh position={[0, 0, 20]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[8, 10, 40, 8]} />
        <meshLambertMaterial color="#aaaaaa" />
      </mesh>

      {/* 상부 장식 */}
      <mesh position={[0, 0, 42]} castShadow>
        <sphereGeometry args={[6, 8, 6]} />
        <meshLambertMaterial color="#cccccc" />
      </mesh>

      {/* 빛 이펙트 */}
      <mesh ref={lightRef} position={[0, 0, 48]}>
        <circleGeometry args={[12, 12]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  )
}

const NPC_RENDERERS: Record<string, typeof ShopMesh> = {
  shop: ShopMesh,
  blacksmith: BlacksmithMesh,
  portal_guide: PortalGuideMesh,
}

interface NpcMeshProps {
  npcs: readonly NpcConfig[]
}

export const NpcMesh = ({ npcs }: NpcMeshProps) => {
  return (
    <group>
      {npcs.map((npc) => {
        const Renderer = NPC_RENDERERS[npc.type] ?? ShopMesh
        return <Renderer key={npc.id} npc={npc} />
      })}
    </group>
  )
}
