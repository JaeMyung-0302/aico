/**
 * 로우폴리 플레이어 모델 팩토리
 * 4클래스별 색상 + 무기 차별화
 * 팔/다리는 상단 pivot으로 프로시져럴 애니메이션 지원
 *
 * 반환: THREE.Group (GLTF 전환 시 동일 인터페이스)
 */

import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshLambertMaterial,
} from 'three'
import type { CharacterClass } from '@soulblade/shared'
import {
  WARRIOR_COLORS,
  MAGE_COLORS,
  PALADIN_COLORS,
  ARCHER_COLORS,
} from './colors'

// ── 치수 (feet at y=0 기준, 총 높이 ~32) ──

const HEAD_R = 5, HEAD_H = 8, HEAD_SEG = 8
const BODY_W = 12, BODY_H = 12, BODY_D = 7
const ARM_W = 4, ARM_H = 10, ARM_D = 4
const LEG_W = 4, LEG_H = 12, LEG_D = 4

// Y 앵커
const LEG_TOP = LEG_H                        // 12
const BODY_MID = LEG_TOP + BODY_H / 2        // 18
const SHOULDER = LEG_TOP + BODY_H - 2        // 22
const HEAD_MID = LEG_TOP + BODY_H + HEAD_H / 2 // 28

const buildMat = (color: number) => new MeshLambertMaterial({ color })

/** 상단 pivot 사지 생성 (geometry를 아래로 오프셋) */
const buildLimb = (w: number, h: number, d: number, color: number, name: string): Mesh => {
  const geo = new BoxGeometry(w, h, d)
  geo.translate(0, -h / 2, 0)
  const mesh = new Mesh(geo, buildMat(color))
  mesh.name = name
  return mesh
}

// ── 클래스별 바디 색상 ──

type BodyPalette = { head: number; body: number; arm: number; leg: number }

const BODY_PALETTE: Record<CharacterClass, BodyPalette> = {
  Warrior: { head: WARRIOR_COLORS.helmet, body: WARRIOR_COLORS.body, arm: WARRIOR_COLORS.arm, leg: WARRIOR_COLORS.leg },
  Mage: { head: MAGE_COLORS.hat, body: MAGE_COLORS.robe, arm: MAGE_COLORS.arm, leg: MAGE_COLORS.robe },
  Paladin: { head: PALADIN_COLORS.head, body: PALADIN_COLORS.body, arm: PALADIN_COLORS.arm, leg: PALADIN_COLORS.leg },
  Archer: { head: ARCHER_COLORS.hood, body: ARCHER_COLORS.body, arm: ARCHER_COLORS.arm, leg: ARCHER_COLORS.leg },
}

// ── 클래스별 무기 팩토리 ──

const WEAPON_BUILDERS: Record<CharacterClass, () => Group> = {
  Warrior: () => {
    const g = new Group()
    const blade = new Mesh(new BoxGeometry(1.5, 14, 1), buildMat(WARRIOR_COLORS.sword))
    blade.position.y = 7
    g.add(blade)
    return g
  },
  Mage: () => {
    const g = new Group()
    const staff = new Mesh(new CylinderGeometry(0.8, 0.8, 20, 6), buildMat(MAGE_COLORS.staff))
    g.add(staff)
    const orb = new Mesh(new SphereGeometry(2, 8, 6), buildMat(MAGE_COLORS.orb))
    orb.position.y = 11
    g.add(orb)
    return g
  },
  Paladin: () => {
    const g = new Group()
    const handle = new Mesh(new CylinderGeometry(0.8, 0.8, 14, 6), buildMat(PALADIN_COLORS.hammerHandle))
    g.add(handle)
    const head = new Mesh(new BoxGeometry(5, 4, 4), buildMat(PALADIN_COLORS.hammerHead))
    head.position.y = -9
    g.add(head)
    return g
  },
  Archer: () => {
    const g = new Group()
    const bow = new Mesh(new BoxGeometry(1, 14, 2), buildMat(ARCHER_COLORS.bow))
    g.add(bow)
    return g
  },
}

// ── 메인 팩토리 ──

export const createPlayerModel = (classType: CharacterClass): Group => {
  const group = new Group()
  const c = BODY_PALETTE[classType]

  // Head
  const head = new Mesh(new CylinderGeometry(HEAD_R, HEAD_R, HEAD_H, HEAD_SEG), buildMat(c.head))
  head.name = 'head'
  head.position.y = HEAD_MID
  group.add(head)

  // Body
  const body = new Mesh(new BoxGeometry(BODY_W, BODY_H, BODY_D), buildMat(c.body))
  body.name = 'body'
  body.position.y = BODY_MID
  group.add(body)

  // Arms (pivot at shoulder)
  const lArm = buildLimb(ARM_W, ARM_H, ARM_D, c.arm, 'leftArm')
  lArm.position.set(-(BODY_W / 2 + ARM_W / 2), SHOULDER, 0)
  group.add(lArm)

  const rArm = buildLimb(ARM_W, ARM_H, ARM_D, c.arm, 'rightArm')
  rArm.position.set(BODY_W / 2 + ARM_W / 2, SHOULDER, 0)
  group.add(rArm)

  // Weapon (right arm child → 함께 회전)
  const weapon = WEAPON_BUILDERS[classType]()
  weapon.name = 'weapon'
  weapon.position.y = -ARM_H
  rArm.add(weapon)

  // Legs (pivot at hip)
  const lLeg = buildLimb(LEG_W, LEG_H, LEG_D, c.leg, 'leftLeg')
  lLeg.position.set(-BODY_W / 4, LEG_TOP, 0)
  group.add(lLeg)

  const rLeg = buildLimb(LEG_W, LEG_H, LEG_D, c.leg, 'rightLeg')
  rLeg.position.set(BODY_W / 4, LEG_TOP, 0)
  group.add(rLeg)

  return group
}
