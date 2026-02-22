/**
 * 플레이어 빌보드 렌더링
 * Canvas2D 스프라이트 시트 + UV 애니메이션
 *
 * 프레임: 0=idle, 1-2=attack, 3-4=walk
 * 좌표계: 게임 Y-down → Three.js Y-up 변환
 * 2.5D 빌보딩: 카메라 기울기만큼 스프라이트를 회전하여 카메라를 향하게 함
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { getSpriteTextures, getFrameUV, SPRITE_FRAME_COUNT } from '../assets/sprite-generator'
import { CAMERA_TILT } from '../core/CameraController'

const WALK_FRAME_MS = 200
const ATTACK_FRAME_MS = 150
// 빌보딩: 스프라이트 하단이 Z=0(지면)에 위치하도록 Z 오프셋
const SPRITE_HALF_H = 24 // PlaneGeometry height 48 / 2
const BILLBOARD_Z = SPRITE_HALF_H * Math.sin(CAMERA_TILT)

export const PlayerBillboard = () => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const animRef = useRef({ timer: 0, toggle: 0, lastFrame: -1 })

  const classType = useEntityStore((s) => s.player?.classType ?? null)
  const hasPlayer = useEntityStore((s) => s.player !== null)

  // 클래스 변경 시 텍스처 교체 (clone으로 독립 UV 제어)
  const texture = useMemo(() => {
    if (!classType) return null
    const tex = getSpriteTextures().player[classType].clone()
    tex.repeat.set(1 / SPRITE_FRAME_COUNT, 1)
    tex.needsUpdate = true
    return tex
  }, [classType])

  // 클래스 전환 시 이전 클론 텍스처 GPU 해제
  useEffect(() => {
    return () => { texture?.dispose() }
  }, [texture])

  useFrame((_state, delta) => {
    const player = useEntityStore.getState().player
    if (!player || !player.active || !meshRef.current || !texture) return

    // 위치 + Y 반전 + 2.5D 빌보딩 Z 오프셋
    meshRef.current.position.set(player.body.x, -player.body.y, BILLBOARD_Z)
    // 카메라 기울기 방향으로 스프라이트 회전 (바닥에 눕지 않고 카메라를 향함)
    meshRef.current.rotation.x = -CAMERA_TILT

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
      texture.offset.x = getFrameUV(frameIdx).offsetX
      anim.lastFrame = frameIdx
    }
  })

  if (!hasPlayer || !texture) return null

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[32, 48]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent alphaTest={0.1} />
    </mesh>
  )
}
