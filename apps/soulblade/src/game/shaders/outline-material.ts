/**
 * Inverted Hull 아웃라인 ShaderMaterial 팩토리
 * BackSide 렌더링 + normal 방향 vertex 확장
 *
 * GLSL ES 1.0 호환 (모바일 지원)
 */

import { ShaderMaterial, BackSide, Color } from 'three'

export interface OutlineMaterialOptions {
  readonly thickness?: number // 아웃라인 두께 (default: 0.03)
  readonly color?: number    // 아웃라인 색상 hex (default: 0x111111)
}

const vertexShader = /* glsl */ `
  uniform float uThickness;

  void main() {
    // view-space normal expansion (normalMatrix가 non-uniform scale 보정)
    #ifdef USE_INSTANCING
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      vec3 viewNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    #else
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vec3 viewNormal = normalize(normalMatrix * normal);
    #endif

    mvPosition.xyz += viewNormal * uThickness;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;

  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`

export const createOutlineMaterial = (options?: OutlineMaterialOptions): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      uThickness: { value: options?.thickness ?? 0.03 },
      uColor: { value: new Color(options?.color ?? 0x111111) },
    },
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
  })
