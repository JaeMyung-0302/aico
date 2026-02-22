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

// 보스 시각 크기 (모델 높이 54 → 시각 ~81px, 몬스터 대비 2.5배)
const MODEL_SCALE = 1.5

export const Boss3D = () => {
  const groupRef = useRef<Group>(null)
  const animRef = useRef({ timer: 0 })
  const prevPhaseRef = useRef<string>('chase')

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

  // 애니메이션 파트 + 메시 배열 캐싱 (traverse 제거)
  const parts = useMemo(() => ({
    rightArm: model.getObjectByName('rightArm') ?? null,
    leftArm: model.getObjectByName('leftArm') ?? null,
    rightLeg: model.getObjectByName('rightLeg') ?? null,
    leftLeg: model.getObjectByName('leftLeg') ?? null,
  }), [model])

  const meshes = useMemo(() => {
    const list: Mesh[] = []
    model.traverse((c) => { if (c instanceof Mesh) list.push(c) })
    return list
  }, [model])

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
    groupRef.current.scale.set(MODEL_SCALE, MODEL_SCALE * (1 + breath), MODEL_SCALE)
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
        groupRef.current.rotation.x = boss.isCharging ? -0.3 : 0
        break
      case 'aoe':
        groupRef.current.rotation.x = 0
        const pulse = Math.sin(anim.timer * 10) * 0.05
        groupRef.current.scale.set(
          MODEL_SCALE * (1 + pulse),
          MODEL_SCALE * (1 + breath + pulse),
          MODEL_SCALE * (1 + pulse),
        )
        break
      case 'summon': {
        groupRef.current.rotation.x = 0
        const glow = Math.sin(anim.timer * 6) * 0.5 + 0.5
        for (const mesh of meshes) {
          const m = mesh.material as MeshLambertMaterial
          m.emissiveIntensity = glow * 0.3
          m.emissive.setHex(0x442211)
        }
        break
      }
    }

    // summon → 다른 phase 전환 시에만 emissive 리셋
    if (prevPhaseRef.current === 'summon' && boss.currentPhase !== 'summon') {
      for (const mesh of meshes) {
        (mesh.material as MeshLambertMaterial).emissiveIntensity = 0
      }
    }
    prevPhaseRef.current = boss.currentPhase
  })

  if (!hasBoss) return null

  return <primitive ref={groupRef} object={model} />
}
