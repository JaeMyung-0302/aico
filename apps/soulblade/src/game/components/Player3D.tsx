/**
 * 3D 로우폴리 플레이어 렌더링
 * PlayerBillboard 교체 컴포넌트
 *
 * 좌표계: 게임 Y-down → Three.js Y-up 변환
 * 애니메이션: useFrame + Math.sin 프로시져럴 (idle/walk/attack)
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import type { Group, MeshLambertMaterial } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createPlayerModel } from '../models/player-model'

// Billboard 32×48에 맞춘 스케일 (모델 높이 32 → 시각 48px)
const MODEL_SCALE = 1.5

export const Player3D = () => {
  const groupRef = useRef<Group>(null)
  const animRef = useRef({ timer: 0 })
  const wasInvincible = useRef(false)

  const classType = useEntityStore((s) => s.player?.classType ?? null)
  const hasPlayer = useEntityStore((s) => s.player !== null)

  const model = useMemo(() => {
    if (!classType) return null
    return createPlayerModel(classType)
  }, [classType])

  // 클래스 전환 시 이전 모델 GPU 리소스 해제
  useEffect(() => {
    return () => {
      if (!model) return
      model.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          if (!Array.isArray(child.material)) {
            child.material.dispose()
          }
        }
      })
    }
  }, [model])

  // 애니메이션 대상 파트 캐싱
  const parts = useMemo(() => {
    if (!model) return null
    return {
      rightArm: model.getObjectByName('rightArm') ?? null,
      leftArm: model.getObjectByName('leftArm') ?? null,
      rightLeg: model.getObjectByName('rightLeg') ?? null,
      leftLeg: model.getObjectByName('leftLeg') ?? null,
    }
  }, [model])

  useFrame((_state, delta) => {
    const player = useEntityStore.getState().player
    if (!player || !player.active || !groupRef.current || !parts) return

    // 위치 (게임 Y-down → Three.js Y-up)
    groupRef.current.position.set(player.body.x, -player.body.y, 0)

    // 이동 방향 X 플립 (스케일 유지)
    const { vx, vy } = player.body
    if (vx < 0) groupRef.current.scale.x = -MODEL_SCALE
    else if (vx > 0) groupRef.current.scale.x = MODEL_SCALE
    groupRef.current.scale.z = MODEL_SCALE

    // 무적 투명도 (상태 변경 시에만)
    if (player.invincible !== wasInvincible.current) {
      wasInvincible.current = player.invincible
      groupRef.current.traverse((child) => {
        if (child instanceof Mesh) {
          const m = child.material as MeshLambertMaterial
          m.transparent = player.invincible
          m.opacity = player.invincible ? 0.5 : 1.0
          m.needsUpdate = true
        }
      })
    }

    // 프로시져럴 애니메이션
    const anim = animRef.current
    anim.timer += delta
    const { rightArm, leftArm, rightLeg, leftLeg } = parts

    if (player.isAttacking) {
      // 공격: 오른팔 빠른 스윙
      if (rightArm) rightArm.rotation.x = Math.sin(anim.timer * 15) * 1.2
      if (leftArm) leftArm.rotation.x = 0
      if (rightLeg) rightLeg.rotation.x = 0
      if (leftLeg) leftLeg.rotation.x = 0
      groupRef.current.scale.y = MODEL_SCALE
    } else if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      // 이동: 팔/다리 교차 진자
      const swing = Math.sin(anim.timer * 8) * 0.6
      if (rightArm) rightArm.rotation.x = swing
      if (leftArm) leftArm.rotation.x = -swing
      if (rightLeg) rightLeg.rotation.x = -swing
      if (leftLeg) leftLeg.rotation.x = swing
      groupRef.current.scale.y = MODEL_SCALE
    } else {
      // 대기: 호흡
      groupRef.current.scale.y = MODEL_SCALE * (1 + Math.sin(anim.timer * 2) * 0.02)
      if (rightArm) rightArm.rotation.x = 0
      if (leftArm) leftArm.rotation.x = 0
      if (rightLeg) rightLeg.rotation.x = 0
      if (leftLeg) leftLeg.rotation.x = 0
    }
  })

  if (!hasPlayer || !model) return null

  return <primitive key={classType} ref={groupRef} object={model} />
}
