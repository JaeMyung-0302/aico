/**
 * 셀셰이딩 ShaderMaterial 팩토리 (InstancedMesh용)
 * vertexColors + instanceColor 지원
 *
 * Monster3D, Elite3D, Projectile3D의 MeshLambertMaterial 대체
 * GLSL ES 1.0 호환 (모바일 지원)
 */

import { ShaderMaterial, Color } from 'three'
import type { CelMaterialOptions } from './types'
import { CEL_DEFAULT_LIGHT_DIR } from './cel-shader'

const vertexShader = /* glsl */ `
  attribute vec3 color;

  #ifdef USE_INSTANCING_COLOR
    attribute vec3 instanceColor;
  #endif

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vColor;

  void main() {
    #ifdef USE_INSTANCING
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      // assumes uniform scale in instanceMatrix (non-uniform requires inverse-transpose)
      vWorldNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    #else
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vWorldNormal = normalize(normalMatrix * normal);
    #endif

    vViewDir = normalize(-mvPosition.xyz);

    // vertexColor × instanceColor (mutation tint)
    vColor = color;
    #ifdef USE_INSTANCING_COLOR
      vColor *= instanceColor;
    #endif

    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uLightDir;
  uniform vec3 uShadowColor;
  uniform float uRimPower;
  uniform float uSteps;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vColor;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 l = normalize(uLightDir);
    vec3 v = normalize(vViewDir);

    // NdotL half-lambert → 2-step quantization
    float NdotL = dot(n, l) * 0.5 + 0.5;
    float steps = max(uSteps, 1.0);
    float quantized = floor(NdotL * steps + 0.5) / steps;

    // Shadow blending
    vec3 litColor = mix(uShadowColor * vColor, vColor, quantized);

    // Rim light (subtle)
    float rim = 1.0 - max(dot(v, n), 0.0);
    rim = pow(rim, uRimPower);
    litColor += vec3(1.0) * rim * 0.2;

    gl_FragColor = vec4(litColor, 1.0);
  }
`

export const createCelInstancedMaterial = (options?: CelMaterialOptions): ShaderMaterial => {
  const shadowC = new Color(options?.shadowColor ?? 0x443355)

  return new ShaderMaterial({
    uniforms: {
      uLightDir: { value: CEL_DEFAULT_LIGHT_DIR.clone() },
      uShadowColor: { value: shadowC.clone() },
      uRimPower: { value: options?.rimPower ?? 3.0 },
      uSteps: { value: options?.steps ?? 2 },
    },
    vertexShader,
    fragmentShader,
  })
}
