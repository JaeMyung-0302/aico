/**
 * NPC 빌보드 렌더링
 * AI 스프라이트 기반 NPC 건물 빌보드
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * NPC 타입별 텍스처: useNpcTextures() → NPC_SPRITE_ASSETS 키 매핑
 * 텍스처 미로드 시 null (MapScene에서 NpcMesh로 폴백)
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Texture } from 'three'
import type { NpcConfig, NpcType } from '@soulblade/shared'
import { useNpcTextures } from '../assets/sprite-loader'
import { NPC_SPRITE_ASSETS } from '../assets/sprite-config'

const NpcSprite = ({
  npc,
  textures,
}: {
  npc: NpcConfig
  textures: Partial<Record<NpcType, Texture>>
}) => {
  const meshRef = useRef<Mesh>(null)

  const tex = textures[npc.type]
  const config = NPC_SPRITE_ASSETS[npc.type]

  // useFrame은 항상 호출 (Rules of Hooks)
  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.quaternion.copy(state.camera.quaternion)
  })

  if (!tex || !config) return null

  const halfH = config.frameHeight / 2

  return (
    <mesh ref={meshRef} position={[npc.position.x, halfH, npc.position.y]}>
      <planeGeometry args={[config.frameWidth, config.frameHeight]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.1} />
    </mesh>
  )
}

interface NpcBillboardProps {
  npcs: readonly NpcConfig[]
}

export const NpcBillboard = ({ npcs }: NpcBillboardProps) => {
  const { textures } = useNpcTextures()

  return (
    <group>
      {npcs.map((npc) => (
        <NpcSprite key={npc.id} npc={npc} textures={textures} />
      ))}
    </group>
  )
}
