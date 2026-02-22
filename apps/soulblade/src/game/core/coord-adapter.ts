/**
 * 좌표 변환 유틸리티 (SSOT)
 * 게임 로직(2D XY) → Three.js 3D(XYZ) 매핑
 *
 * body.x → Three.js X (동일)
 * body.y → Three.js Z (깊이축)
 * Three.js Y → 지형 높이 (현재 평면 = 0)
 */

// 지형 높이 (향후 HeightMap 연동 포인트)
const GROUND_Y = 0

/**
 * 게임 좌표(body.x, body.y)를 Three.js 월드 좌표로 변환
 * @returns [x, y, z] Three.js 좌표
 */
export const gameToWorld = (x: number, y: number): [number, number, number] => [
  x,
  GROUND_Y,
  y,
]
