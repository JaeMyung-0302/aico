/**
 * 지형 높이맵 유틸리티
 * 현재 0 반환 (평면 지형). 향후 displacement 지형 확장 포인트.
 *
 * coord-adapter의 GROUND_Y와 연동:
 * - 엔티티 Y = GROUND_Y + getTerrainHeight(x, z)
 * - 현재: Y = 0 + 0 = 0 (평면)
 */

/** 게임 좌표 (x, z)에서 지형 높이를 반환 */
export const getTerrainHeight = (_x: number, _z: number): number => 0
