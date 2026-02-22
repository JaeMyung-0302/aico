/**
 * 몬스터 로우폴리 지오메트리 팩토리
 * mergeGeometries + vertex color로 단일 BufferGeometry 반환
 * InstancedMesh에서 drawcall 1로 최대 60마리 렌더링
 */

import { BoxGeometry, CylinderGeometry } from 'three'
import type { BufferGeometry } from 'three'
import { setVertexColor, mergeAndCenter } from './helpers'
import { MONSTER_COLORS } from './colors'

// 치수: 총 높이 ~17 (feet=0 기준)
const HEAD_R = 5, HEAD_H = 5, HEAD_SEG = 6
const BODY_W = 10, BODY_H = 7, BODY_D = 6
const ARM_W = 4, ARM_H = 6, ARM_D = 3
const LEG_W = 3, LEG_H = 5, LEG_D = 3
const CLAW = 2, EYE_W = 2, EYE_H = 1.5

// Y 앵커
const LEG_MID = LEG_H / 2                // 2.5
const BODY_MID = LEG_H + BODY_H / 2      // 8.5
const ARM_MID = LEG_H + BODY_H / 2 - 0.5 // 8
const HEAD_MID = LEG_H + BODY_H + HEAD_H / 2 // 14.5

const part = (geo: BufferGeometry, x: number, y: number, z: number, color: number): BufferGeometry => {
  geo.translate(x, y, z)
  setVertexColor(geo, color)
  return geo
}

export const createMonsterGeometry = (): BufferGeometry => {
  const parts: BufferGeometry[] = [
    // Head
    part(new CylinderGeometry(HEAD_R, HEAD_R, HEAD_H, HEAD_SEG), 0, HEAD_MID, 0, MONSTER_COLORS.head),
    // Eyes
    part(new BoxGeometry(EYE_W, EYE_H, 1), -2, HEAD_MID + 1, HEAD_R - 0.5, MONSTER_COLORS.eyes),
    part(new BoxGeometry(EYE_W, EYE_H, 1), 2, HEAD_MID + 1, HEAD_R - 0.5, MONSTER_COLORS.eyes),
    // Body
    part(new BoxGeometry(BODY_W, BODY_H, BODY_D), 0, BODY_MID, 0, MONSTER_COLORS.body),
    // Arms
    part(new BoxGeometry(ARM_W, ARM_H, ARM_D), -(BODY_W / 2 + ARM_W / 2), ARM_MID, 0, MONSTER_COLORS.arm),
    part(new BoxGeometry(ARM_W, ARM_H, ARM_D), BODY_W / 2 + ARM_W / 2, ARM_MID, 0, MONSTER_COLORS.arm),
    // Claws
    part(new BoxGeometry(CLAW, CLAW, CLAW), -(BODY_W / 2 + ARM_W + 1), ARM_MID - ARM_H / 2, 0, MONSTER_COLORS.claw),
    part(new BoxGeometry(CLAW, CLAW, CLAW), BODY_W / 2 + ARM_W + 1, ARM_MID - ARM_H / 2, 0, MONSTER_COLORS.claw),
    // Legs
    part(new BoxGeometry(LEG_W, LEG_H, LEG_D), -BODY_W / 4, LEG_MID, 0, MONSTER_COLORS.leg),
    part(new BoxGeometry(LEG_W, LEG_H, LEG_D), BODY_W / 4, LEG_MID, 0, MONSTER_COLORS.leg),
  ]

  return mergeAndCenter(parts)
}
