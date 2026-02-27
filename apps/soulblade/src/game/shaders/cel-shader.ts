/**
 * 셀셰이딩 ShaderMaterial 팩토리 (단일 Mesh용)
 * Player/Boss Group 모델의 buildMat() 대체
 *
 * 2-step NdotL 양자화 + rim light + shadow color
 * GLSL ES 1.0 호환 (모바일 지원)
 */

import { ShaderMaterial, Color, Vector3 } from 'three'
import type { CelMaterialOptions } from './types'

/** 셀셰이딩 기본 라이트 방향 (cel-instanced-shader와 공유) */
export const CEL_DEFAULT_LIGHT_DIR = new Vector3(0.5, 1.0, 0.3).normalize()

const vertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform vec3 uShadowColor;
  uniform vec3 uRimColor;
  uniform float uRimPower;
  uniform float uSteps;
  uniform float uOpacity;
  uniform vec3 uEmissive;
  uniform float uEmissiveIntensity;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 l = normalize(uLightDir);
    vec3 v = normalize(vViewDir);

    // NdotL half-lambert → 2-step quantization
    float NdotL = dot(n, l) * 0.5 + 0.5;
    float steps = max(uSteps, 1.0);
    float quantized = floor(NdotL * steps + 0.5) / steps;

    // Shadow blending
    vec3 litColor = mix(uShadowColor * uColor, uColor, quantized);

    // Rim light
    float rim = 1.0 - max(dot(v, n), 0.0);
    rim = pow(rim, uRimPower);
    litColor += uRimColor * rim * 0.3;

    // Emissive
    litColor += uEmissive * uEmissiveIntensity;

    gl_FragColor = vec4(litColor, uOpacity);
  }
`

export const createCelMaterial = (
  color: number,
  options?: CelMaterialOptions,
): ShaderMaterial => {
  const c = new Color(color)
  const shadowC = new Color(options?.shadowColor ?? 0x443355)
  const rimC = new Color(options?.rimColor ?? 0xffffff)

  return new ShaderMaterial({
    uniforms: {
      uColor: { value: c.clone() },
      uLightDir: { value: CEL_DEFAULT_LIGHT_DIR.clone() },
      uShadowColor: { value: shadowC.clone() },
      uRimColor: { value: rimC.clone() },
      uRimPower: { value: options?.rimPower ?? 3.0 },
      uSteps: { value: options?.steps ?? 2 },
      uOpacity: { value: 1.0 },
      uEmissive: { value: new Vector3(0, 0, 0) },
      uEmissiveIntensity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: false,
  })
}
