/**
 * NPC 3D 메시 렌더링
 * 프로시저럴 건물/석상 (조명 반응 + 발광 디테일)
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * NPC 타입별 외형:
 * - shop: 상점 건물 (8면 지붕 + 처마 + 문 + 간판)
 * - blacksmith: 대장간 (지붕 슬래브 + 굴뚝 + T형 모루 + 화로)
 * - portal_guide: 석상 기둥 + 기단 + 볼류메트릭 빛 + 회전 링
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
  const posZ = npc.position.y

  return (
    <group position={[posX, 0, posZ]}>
      {/* 건물 본체 */}
      <mesh position={[0, 15, 0]} castShadow>
        <boxGeometry args={[48, 30, 40]} />
        <meshLambertMaterial color="#8b7355" />
      </mesh>

      {/* 지붕 처마 (넓고 얇은 원뿔) */}
      <mesh position={[0, 30, 0]} castShadow>
        <coneGeometry args={[36, 3, 8]} />
        <meshLambertMaterial color="#993333" />
      </mesh>

      {/* 지붕 (8면 → 부드러운 형태) */}
      <mesh position={[0, 35, 0]} castShadow>
        <coneGeometry args={[30, 16, 8]} />
        <meshLambertMaterial color="#b84444" />
      </mesh>

      {/* 지붕 꼭대기 장식 */}
      <mesh position={[0, 44, 0]}>
        <sphereGeometry args={[2.5, 6, 4]} />
        <meshLambertMaterial color="#cc5555" />
      </mesh>

      {/* 문 */}
      <mesh position={[0, 8, 20.5]}>
        <boxGeometry args={[10, 16, 1]} />
        <meshLambertMaterial color="#3a2a1a" />
      </mesh>

      {/* 창문 왼쪽 (따뜻한 빛 — 발광) */}
      <mesh position={[-14, 16, 21]}>
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial color="#ffdd88" />
      </mesh>

      {/* 창문 오른쪽 */}
      <mesh position={[14, 16, 21]}>
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial color="#ffdd88" />
      </mesh>

      {/* 간판 (발광 — Bloom에 반응) */}
      <mesh position={[26, 20, 10]}>
        <boxGeometry args={[1, 8, 12]} />
        <meshBasicMaterial color="#ddaa44" />
      </mesh>

      {/* 진열대 */}
      <mesh position={[0, 5, 24]} castShadow>
        <boxGeometry args={[34, 8, 6]} />
        <meshLambertMaterial color="#6b5335" />
      </mesh>

      {/* 처마 (진열대 위) */}
      <mesh position={[0, 12, 25]}>
        <boxGeometry args={[36, 1, 8]} />
        <meshLambertMaterial color="#7a6345" />
      </mesh>
    </group>
  )
}

// 대장간 NPC
const BlacksmithMesh = ({ npc }: { npc: NpcConfig }) => {
  const posX = npc.position.x
  const posZ = npc.position.y
  const glowRef = useRef<Mesh>(null)
  const smokeRef = useRef<Mesh>(null)
  const elapsedRef = useRef(0)

  // 화로 깜빡임 + 연기 효과
  useFrame((_state, delta) => {
    elapsedRef.current += delta
    const t = elapsedRef.current

    const glowMat = glowRef.current?.material as MeshBasicMaterial | undefined
    if (glowMat) {
      glowMat.opacity = 0.6 + Math.sin(t * 5) * 0.15 + Math.sin(t * 8.3) * 0.1
    }

    const smokeMat = smokeRef.current?.material as MeshBasicMaterial | undefined
    if (smokeMat) {
      smokeMat.opacity = 0.15 + Math.sin(t * 1.5) * 0.1
    }
  })

  return (
    <group position={[posX, 0, posZ]}>
      {/* 건물 본체 */}
      <mesh position={[0, 15, 0]} castShadow>
        <boxGeometry args={[50, 30, 44]} />
        <meshLambertMaterial color="#666666" />
      </mesh>

      {/* 지붕 슬래브 */}
      <mesh position={[0, 31, 0]} castShadow>
        <boxGeometry args={[54, 3, 48]} />
        <meshLambertMaterial color="#555555" />
      </mesh>

      {/* 굴뚝 */}
      <mesh position={[16, 38, 0]} castShadow>
        <boxGeometry args={[10, 16, 10]} />
        <meshLambertMaterial color="#555555" />
      </mesh>

      {/* 굴뚝 연기 (정적, 투명) */}
      <mesh
        ref={smokeRef}
        position={[16, 48, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[5, 8]} />
        <meshBasicMaterial
          color="#999999"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* 문 (어두운 입구) */}
      <mesh position={[8, 9, 22.5]}>
        <boxGeometry args={[12, 18, 1]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>

      {/* 모루 — T형 (받침 + 상판) */}
      <mesh position={[-10, 3, 26]}>
        <boxGeometry args={[8, 6, 8]} />
        <meshLambertMaterial color="#444444" />
      </mesh>
      <mesh position={[-10, 7.5, 26]}>
        <boxGeometry args={[14, 3, 10]} />
        <meshLambertMaterial color="#555555" />
      </mesh>

      {/* 도구 선반 */}
      <mesh position={[-20, 10, 22]}>
        <boxGeometry args={[6, 14, 2]} />
        <meshLambertMaterial color="#5a4a3a" />
      </mesh>

      {/* 화로 불빛 */}
      <mesh ref={glowRef} position={[10, 8, 24]}>
        <circleGeometry args={[8, 12]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

// 포탈 가이드 (석상) NPC
const PortalGuideMesh = ({ npc }: { npc: NpcConfig }) => {
  const posX = npc.position.x
  const posZ = npc.position.y
  const lightRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const elapsedRef = useRef(0)

  // 빛 맥동 + 링 회전 효과
  useFrame((_state, delta) => {
    elapsedRef.current += delta
    const t = elapsedRef.current

    const mat = lightRef.current?.material as MeshBasicMaterial | undefined
    if (mat) {
      mat.opacity = 0.4 + Math.sin(t * 2) * 0.3
    }

    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 1.5
      ringRef.current.rotation.x = Math.sin(t * 0.8) * 0.3
    }
  })

  return (
    <group position={[posX, 0, posZ]}>
      {/* 기단 */}
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[20, 4, 20]} />
        <meshLambertMaterial color="#999999" />
      </mesh>

      {/* 기둥 */}
      <mesh position={[0, 24, 0]} castShadow>
        <cylinderGeometry args={[7, 10, 44, 8]} />
        <meshLambertMaterial color="#aaaaaa" />
      </mesh>

      {/* 상부 장식 */}
      <mesh position={[0, 48, 0]} castShadow>
        <sphereGeometry args={[6, 8, 6]} />
        <meshLambertMaterial color="#cccccc" />
      </mesh>

      {/* 장식 링 (회전) */}
      <mesh ref={ringRef} position={[0, 48, 0]}>
        <torusGeometry args={[9, 1, 6, 16]} />
        <meshBasicMaterial color="#88ccff" transparent opacity={0.5} />
      </mesh>

      {/* 볼류메트릭 빛 이펙트 (구형) */}
      <mesh ref={lightRef} position={[0, 54, 0]}>
        <sphereGeometry args={[8, 8, 6]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={0.5}
          depthWrite={false}
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
