/**
 * 셰이더 시스템 타입 정의
 * 셀셰이딩 + 아웃라인 유니폼/옵션
 */

import type { Vector3 } from 'three'

/** 셀셰이딩 셰이더 유니폼 */
export interface CelShadingUniforms {
  readonly uLightDir: { value: Vector3 }
  readonly uBaseColor: { value: Vector3 }
  readonly uShadowColor: { value: Vector3 }
  readonly uShadowThreshold: { value: number }
  readonly uRimColor: { value: Vector3 }
  readonly uRimPower: { value: number }
  readonly uSteps: { value: number }
}

/** 아웃라인 셰이더 유니폼 */
export interface OutlineUniforms {
  readonly uOutlineThickness: { value: number }
  readonly uOutlineColor: { value: Vector3 }
}

/** 셀 머티리얼 생성 옵션 */
export interface CelMaterialOptions {
  readonly steps?: number       // 명암 단계 (default: 2)
  readonly rimPower?: number    // 림 라이트 세기 (default: 3.0)
  readonly shadowColor?: number // 그림자 색상 hex (default: 0x443355)
  readonly rimColor?: number    // 림 라이트 색상 hex (default: 0xffffff)
}
