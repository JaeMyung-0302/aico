/**
 * GLTF 모델 로딩 유틸리티
 * - 경로 상수 (에셋 배치 시 자동 인식)
 * - 셀셰이딩 적용 헬퍼
 * - ErrorBoundary (Suspense 실패 시 프로시져럴 폴백)
 */

import { Component, type ReactNode } from 'react'
import { Mesh } from 'three'
import type { Group, Material } from 'three'
import { createCelMaterial } from '../shaders/cel-shader'

// ── GLTF 에셋 경로 ──
export const PLAYER_GLTF_PATH = '/assets/models/player.glb'
export const BOSS_GLTF_PATH = '/assets/models/boss.glb'

/**
 * GLTF scene의 모든 Mesh에 셀셰이딩 적용
 * 기존 material의 color hex를 추출하여 createCelMaterial로 교체
 */
export const applyCelShading = (scene: Group): void => {
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      const firstMat = materials[0] as Material & { color?: { getHex: () => number } }
      const hex = firstMat.color?.getHex?.() ?? 0x888888
      child.material = createCelMaterial(hex)
      for (const mat of materials) mat.dispose()
    }
  })
}

// ── GLTF ErrorBoundary ──
// useGLTF Suspense가 404 시 throw하면 이 boundary가 잡아서 fallback 렌더

interface GLTFFallbackProps {
  children: ReactNode
  fallback: ReactNode
}

interface GLTFFallbackState {
  hasError: boolean
}

export class GLTFFallback extends Component<GLTFFallbackProps, GLTFFallbackState> {
  state: GLTFFallbackState = { hasError: false }

  static getDerivedStateFromError(): GLTFFallbackState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
