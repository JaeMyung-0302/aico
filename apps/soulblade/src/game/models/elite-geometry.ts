/**
 * 엘리트 몬스터 로우폴리 지오메트리 팩토리
 * 몬스터 대비 확대 + 뿔/어깨 디테일
 * mergeGeometries + vertex color → InstancedMesh MAX 20
 */

import { BoxGeometry, CylinderGeometry, ConeGeometry } from 'three'
import type { BufferGeometry } from 'three'
import { setVertexColor, mergeAndCenter } from './helpers'
import { ELITE_COLORS } from './colors'

// 치수: 총 높이 ~27 (뿔 포함)
const HEAD_R = 7, HEAD_H = 7, HEAD_SEG = 6
const HORN_R = 2, HORN_H = 4, HORN_SEG = 4
const BODY_W = 16, BODY_H = 9, BODY_D = 8
const SHOULDER_W = 8, SHOULDER_H = 3, SHOULDER_D = 5
const ARM_W = 6, ARM_H = 8, ARM_D = 4
const LEG_W = 5, LEG_H = 7, LEG_D = 5

// Y 앵커
const LEG_MID = LEG_H / 2                       // 3.5
const BODY_MID = LEG_H + BODY_H / 2             // 11.5
const SHOULDER_Y = LEG_H + BODY_H - 1           // 15
const ARM_MID = LEG_H + BODY_H / 2              // 11.5
const HEAD_MID = LEG_H + BODY_H + HEAD_H / 2    // 19.5
const HORN_Y = LEG_H + BODY_H + HEAD_H + HORN_H / 2 // 25

const part = (geo: BufferGeometry, x: number, y: number, z: number, color: number): BufferGeometry => {
  geo.translate(x, y, z)
  setVertexColor(geo, color)
  return geo
}

export const createEliteGeometry = (): BufferGeometry => {
  const parts: BufferGeometry[] = [
    // Head
    part(new CylinderGeometry(HEAD_R, HEAD_R, HEAD_H, HEAD_SEG), 0, HEAD_MID, 0, ELITE_COLORS.head),
    // Eyes (outer + inner)
    part(new BoxGeometry(3, 2, 1), -3, HEAD_MID + 1, HEAD_R - 0.5, ELITE_COLORS.eyesOuter),
    part(new BoxGeometry(3, 2, 1), 3, HEAD_MID + 1, HEAD_R - 0.5, ELITE_COLORS.eyesOuter),
    part(new BoxGeometry(1.5, 1, 1.2), -3, HEAD_MID + 1, HEAD_R, ELITE_COLORS.eyesInner),
    part(new BoxGeometry(1.5, 1, 1.2), 3, HEAD_MID + 1, HEAD_R, ELITE_COLORS.eyesInner),
    // Horns
    part(new ConeGeometry(HORN_R, HORN_H, HORN_SEG), -4, HORN_Y, 0, ELITE_COLORS.horn),
    part(new ConeGeometry(HORN_R, HORN_H, HORN_SEG), 4, HORN_Y, 0, ELITE_COLORS.horn),
    // Body
    part(new BoxGeometry(BODY_W, BODY_H, BODY_D), 0, BODY_MID, 0, ELITE_COLORS.body),
    // Body detail (belt area)
    part(new BoxGeometry(BODY_W + 1, 2, BODY_D + 1), 0, BODY_MID, 0, ELITE_COLORS.bodyDetail),
    // Shoulders
    part(new BoxGeometry(SHOULDER_W, SHOULDER_H, SHOULDER_D), -(BODY_W / 2 + 1), SHOULDER_Y, 0, ELITE_COLORS.shoulder),
    part(new BoxGeometry(SHOULDER_W, SHOULDER_H, SHOULDER_D), BODY_W / 2 + 1, SHOULDER_Y, 0, ELITE_COLORS.shoulder),
    // Arms
    part(new BoxGeometry(ARM_W, ARM_H, ARM_D), -(BODY_W / 2 + ARM_W / 2), ARM_MID, 0, ELITE_COLORS.arm),
    part(new BoxGeometry(ARM_W, ARM_H, ARM_D), BODY_W / 2 + ARM_W / 2, ARM_MID, 0, ELITE_COLORS.arm),
    // Legs
    part(new BoxGeometry(LEG_W, LEG_H, LEG_D), -BODY_W / 4, LEG_MID, 0, ELITE_COLORS.leg),
    part(new BoxGeometry(LEG_W, LEG_H, LEG_D), BODY_W / 4, LEG_MID, 0, ELITE_COLORS.leg),
  ]

  return mergeAndCenter(parts)
}
