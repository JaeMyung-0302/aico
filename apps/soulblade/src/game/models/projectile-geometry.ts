/**
 * 투사체(화살) 로우폴리 지오메트리 팩토리
 * 화살대 + 촉 + 깃 3파트
 * mergeGeometries + vertex color → InstancedMesh MAX 30
 */

import { BoxGeometry, ConeGeometry } from 'three'
import type { BufferGeometry } from 'three'
import { setVertexColor, mergeAndCenter } from './helpers'
import { PROJECTILE_COLORS } from './colors'

export const createProjectileGeometry = (): BufferGeometry => {
  // 화살대 (가로 방향, +X가 촉 방향)
  const shaft = new BoxGeometry(10, 1.5, 1.5)
  setVertexColor(shaft, PROJECTILE_COLORS.shaft)

  // 촉 (90도 회전하여 +X 방향으로 뾰족하게)
  const tip = new ConeGeometry(1.5, 3, 4)
  tip.rotateZ(-Math.PI / 2)
  tip.translate(6.5, 0, 0)
  setVertexColor(tip, PROJECTILE_COLORS.tip)

  // 깃 (2장, 꼬리 쪽)
  const fletchTop = new ConeGeometry(1, 2, 3)
  fletchTop.rotateZ(Math.PI / 2)
  fletchTop.translate(-5.5, 1, 0)
  setVertexColor(fletchTop, PROJECTILE_COLORS.fletching)

  const fletchBot = new ConeGeometry(1, 2, 3)
  fletchBot.rotateZ(Math.PI / 2)
  fletchBot.translate(-5.5, -1, 0)
  setVertexColor(fletchBot, PROJECTILE_COLORS.fletching)

  return mergeAndCenter([shaft, tip, fletchTop, fletchBot])
}
