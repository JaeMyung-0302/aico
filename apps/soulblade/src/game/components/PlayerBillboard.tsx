/**
 * 플레이어 빌보드 렌더링
 * Canvas2D 스프라이트 시트 + UV 애니메이션
 *
 * 프레임: 0=idle, 1-2=attack, 3-4=walk
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * 빌보딩: 카메라 quaternion 복사로 항상 카메라를 향함
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { useSpriteTextures } from '../assets/sprite-loader'
import { PLAYER_SPRITE_ASSETS } from '../assets/sprite-config'

const WALK_FRAME_MS = 200
const ATTACK_FRAME_MS = 150

export const PlayerBillboard = () => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const animRef = useRef({ timer: 0, toggle: 0, lastFrame: -1 })

  const classType = useEntityStore((s) => s.player?.classType ?? null)
  const hasPlayer = useEntityStore((s) => s.player !== null)
  const { textures } = useSpriteTextures()

  const config = classType ? PLAYER_SPRITE_ASSETS[classType] : null
  const frameCount = config?.frameCount ?? 5
  // 스프라이트 중심이 지면 위에 위치하도록 Y 오프셋
  const spriteHalfH = config ? config.frameHeight / 2 : 24

  // 클래스 변경 시 텍스처 교체 (clone으로 독립 UV 제어)
  const texture = useMemo(() => {
    if (!classType) return null
    const tex = textures.player[classType].clone()
    tex.repeat.set(1 / frameCount, 1)
    tex.needsUpdate = true
    return tex
  }, [classType, textures, frameCount])

  // 클래스 전환 시 이전 클론 텍스처 GPU 해제
  useEffect(() => {
    return () => { texture?.dispose() }
  }, [texture])

  useFrame((state, delta) => {
    const player = useEntityStore.getState().player
    if (!player || !player.active || !meshRef.current || !texture) return

    // 위치 (게임 XY → Three.js XZ) + Y 높이 오프셋
    meshRef.current.position.set(player.body.x, spriteHalfH, player.body.y)
    // 카메라를 향하도록 빌보딩
    meshRef.current.quaternion.copy(state.camera.quaternion)

    // 이동 방향에 따른 X 플립
    const { vx, vy } = player.body
    if (vx < 0) meshRef.current.scale.x = -1
    else if (vx > 0) meshRef.current.scale.x = 1

    // 무적 투명도
    if (materialRef.current) {
      materialRef.current.opacity = player.invincible ? 0.5 : 1.0
    }

    // 프레임 결정
    const anim = animRef.current
    const dt = delta * 1000
    let frameIdx: number

    if (player.isAttacking) {
      anim.timer += dt
      frameIdx = anim.timer % (ATTACK_FRAME_MS * 2) < ATTACK_FRAME_MS ? 1 : 2
    } else if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      anim.timer += dt
      if (anim.timer >= WALK_FRAME_MS) {
        anim.timer -= WALK_FRAME_MS
        anim.toggle = anim.toggle === 0 ? 1 : 0
      }
      frameIdx = 3 + anim.toggle
    } else {
      frameIdx = 0
      anim.timer = 0
      anim.toggle = 0
    }

    // UV 업데이트 (프레임 변경 시에만)
    if (frameIdx !== anim.lastFrame) {
      texture.offset.x = frameIdx / frameCount
      anim.lastFrame = frameIdx
    }
  })

  if (!hasPlayer || !texture) return null

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[config?.frameWidth ?? 32, config?.frameHeight ?? 48]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent alphaTest={0.1} />
    </mesh>
  )
}
