/**
 * GLTF 플레이어 모델 로더
 * drei useGLTF 래핑 + 셀셰이딩 자동 적용
 *
 * 사용: /assets/models/player.glb 배치 시 자동 활성화
 * 인터페이스: 프로시져럴 모델과 동일 (Group + named parts)
 */

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Mesh } from 'three'
import type { Group, Object3D } from 'three'
import { PLAYER_GLTF_PATH, applyCelShading } from './gltf-loader'

/**
 * GLTF 플레이어 모델을 로드하고 셀셰이딩을 적용한 Group 반환
 * Suspense 내부에서 사용해야 함 (useGLTF가 suspend)
 *
 * GLTF 모델 요구사항:
 * - named children: head, body, leftArm, rightArm, leftLeg, rightLeg, weapon
 * - feet at y=0 기준
 */
export const usePlayerGLTF = (): Group => {
  const gltf = useGLTF(PLAYER_GLTF_PATH)
  const { scene } = Array.isArray(gltf) ? gltf[0] : gltf

  const model = useMemo(() => {
    const cloned = scene.clone(true)
    // clone(true)는 material을 참조 공유하므로 명시적 clone 필요 (원본 오염 방지)
    cloned.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material.clone()
      }
    })
    applyCelShading(cloned)
    return cloned
  }, [scene])

  return model
}

// 에셋 배치 후 활성화 (현재는 404 콘솔 에러만 발생)
// useGLTF.preload(PLAYER_GLTF_PATH)
