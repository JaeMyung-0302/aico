/**
 * 3D 보스 렌더링
 * createBossModel() Group + BossPhase별 시각 피드백
 *
 * 신규 컴포넌트 (기존 BossBillboard 없음)
 * 애니메이션: idle 호흡 + 팔 진자 + phase 피드백
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import type { Group, MeshLambertMaterial } from 'three'
import { useEntityStore } from '../stores/useEntityStore'
import { createBossModel } from '../models/boss-model'

export const Boss3D = () => {
  const groupRef = useRef<Group>(null)
  const animRef = useRef({ timer: 0 })

  const hasBoss = useEntityStore((s) => s.boss !== null)

  const model = useMemo(() => createBossModel(), [])

  // GPU 리소스 해제
  useEffect(() => {
    return () => {
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

  // 애니메이션 파트 캐싱
  const parts = useMemo(() => ({
    rightArm: model.getObjectByName('rightArm') ?? null,
    leftArm: model.getObjectByName('leftArm') ?? null,
    rightLeg: model.getObjectByName('rightLeg') ?? null,
    leftLeg: model.getObjectByName('leftLeg') ?? null,
  }), [model])

  useFrame((_state, delta) => {
    const boss = useEntityStore.getState().boss
    if (!boss || !boss.active || !groupRef.current) return

    // 위치 (게임 Y-down → Three.js Y-up)
    groupRef.current.position.set(boss.body.x, -boss.body.y, 0)

    // 프로시져럴 애니메이션
    const anim = animRef.current
    anim.timer += delta
    const { rightArm, leftArm, rightLeg, leftLeg } = parts

    // 대기: 호흡 + 팔 진자
    const breath = Math.sin(anim.timer * 1.5) * 0.015
    groupRef.current.scale.set(1, 1 + breath, 1)
    const armSwing = Math.sin(anim.timer * 2) * 0.3
    if (rightArm) rightArm.rotation.x = armSwing
    if (leftArm) leftArm.rotation.x = -armSwing
    if (rightLeg) rightLeg.rotation.x = -armSwing * 0.3
    if (leftLeg) leftLeg.rotation.x = armSwing * 0.3

    // BossPhase 시각 피드백
    switch (boss.currentPhase) {
      case 'chase':
        groupRef.current.rotation.x = 0
        break
      case 'charge':
        // 앞으로 기울임 (돌진 자세)
        groupRef.current.rotation.x = boss.isCharging ? -0.3 : 0
        break
      case 'aoe':
        // scale 펄스 (범위 공격)
        groupRef.current.scale.set(
          1 + Math.sin(anim.timer * 10) * 0.05,
          1 + breath + Math.sin(anim.timer * 10) * 0.05,
          1 + Math.sin(anim.timer * 10) * 0.05,
        )
        break
      case 'summon':
        // emissive 글로우 (소환 중)
        model.traverse((child) => {
          if (child instanceof Mesh) {
            const m = child.material as MeshLambertMaterial
            const glow = Math.sin(anim.timer * 6) * 0.5 + 0.5
            m.emissiveIntensity = glow * 0.3
            m.emissive.setHex(0x442211)
          }
        })
        break
    }

    // summon이 아닐 때 emissive 리셋
    if (boss.currentPhase !== 'summon') {
      model.traverse((child) => {
        if (child instanceof Mesh) {
          const m = child.material as MeshLambertMaterial
          if (m.emissiveIntensity > 0) {
            m.emissiveIntensity = 0
          }
        }
      })
    }
  })

  if (!hasBoss) return null

  return <primitive ref={groupRef} object={model} />
}
