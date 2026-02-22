/**
 * 보스 로우폴리 모델 팩토리
 * 몬스터 대비 2-3배 스케일 + 뿔/이빨 디테일
 * 팔/다리 파트에 name 지정으로 프로시져럴 애니메이션 지원
 *
 * 반환: THREE.Group (Player와 동일 인터페이스)
 */

import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  MeshLambertMaterial,
} from 'three'
import { BOSS_COLORS } from './colors'

// ── 치수 (총 높이 ~51, feet=0 기준) ──

const HEAD_R = 11, HEAD_H = 11, HEAD_SEG = 8
const HORN_R = 3, HORN_H = 6, HORN_SEG = 4
const HORN_SM_R = 2, HORN_SM_H = 4
const BODY_W = 32, BODY_H = 20, BODY_D = 16
const ARM_W = 8, ARM_H = 14, ARM_D = 6
const SHOULDER_W = 10, SHOULDER_H = 4, SHOULDER_D = 7
const LEG_W = 8, LEG_H = 14, LEG_D = 8

// Y 앵커
const LEG_TOP = LEG_H                          // 14
const BODY_MID = LEG_TOP + BODY_H / 2          // 24
const SHOULDER = LEG_TOP + BODY_H - 2          // 32
const HEAD_MID = LEG_TOP + BODY_H + HEAD_H / 2 // 45
const HORN_Y = LEG_TOP + BODY_H + HEAD_H + HORN_H / 2 // 51

const buildMat = (color: number) => new MeshLambertMaterial({ color })

/** 상단 pivot 사지 생성 */
const buildLimb = (w: number, h: number, d: number, color: number, name: string): Mesh => {
  const geo = new BoxGeometry(w, h, d)
  geo.translate(0, -h / 2, 0)
  const mesh = new Mesh(geo, buildMat(color))
  mesh.name = name
  return mesh
}

export const createBossModel = (): Group => {
  const group = new Group()

  // Head
  const head = new Mesh(new CylinderGeometry(HEAD_R, HEAD_R, HEAD_H, HEAD_SEG), buildMat(BOSS_COLORS.head))
  head.name = 'head'
  head.position.y = HEAD_MID
  group.add(head)

  // Mouth
  const mouth = new Mesh(new BoxGeometry(8, 3, HEAD_R + 1), buildMat(BOSS_COLORS.mouth))
  mouth.position.set(0, HEAD_MID - 3, 2)
  group.add(mouth)

  // Teeth
  const teeth = new Mesh(new BoxGeometry(6, 1.5, 1), buildMat(BOSS_COLORS.teeth))
  teeth.position.set(0, HEAD_MID - 2, HEAD_R)
  group.add(teeth)

  // Eyes
  const eyeOuter = (x: number) => {
    const m = new Mesh(new BoxGeometry(4, 3, 1), buildMat(BOSS_COLORS.eyesOuter))
    m.position.set(x, HEAD_MID + 2, HEAD_R - 0.5)
    return m
  }
  const eyeInner = (x: number) => {
    const m = new Mesh(new BoxGeometry(2, 1.5, 1.2), buildMat(BOSS_COLORS.eyesInner))
    m.position.set(x, HEAD_MID + 2, HEAD_R)
    return m
  }
  group.add(eyeOuter(-4), eyeOuter(4), eyeInner(-4), eyeInner(4))

  // Horns (main)
  const hornL = new Mesh(new ConeGeometry(HORN_R, HORN_H, HORN_SEG), buildMat(BOSS_COLORS.horn))
  hornL.position.set(-6, HORN_Y, 0)
  group.add(hornL)
  const hornR = new Mesh(new ConeGeometry(HORN_R, HORN_H, HORN_SEG), buildMat(BOSS_COLORS.horn))
  hornR.position.set(6, HORN_Y, 0)
  group.add(hornR)

  // Horns (small, outer)
  const smHornL = new Mesh(new ConeGeometry(HORN_SM_R, HORN_SM_H, HORN_SEG), buildMat(BOSS_COLORS.hornSmall))
  smHornL.position.set(-10, HORN_Y - 2, 0)
  group.add(smHornL)
  const smHornR = new Mesh(new ConeGeometry(HORN_SM_R, HORN_SM_H, HORN_SEG), buildMat(BOSS_COLORS.hornSmall))
  smHornR.position.set(10, HORN_Y - 2, 0)
  group.add(smHornR)

  // Body
  const body = new Mesh(new BoxGeometry(BODY_W, BODY_H, BODY_D), buildMat(BOSS_COLORS.body))
  body.name = 'body'
  body.position.y = BODY_MID
  group.add(body)

  // Belly detail
  const belly = new Mesh(new BoxGeometry(BODY_W - 8, BODY_H - 4, BODY_D + 1), buildMat(BOSS_COLORS.belly))
  belly.position.set(0, BODY_MID, 1)
  group.add(belly)

  // Shoulders
  const shL = new Mesh(new BoxGeometry(SHOULDER_W, SHOULDER_H, SHOULDER_D), buildMat(BOSS_COLORS.shoulder))
  shL.position.set(-(BODY_W / 2 + 2), SHOULDER, 0)
  group.add(shL)
  const shR = new Mesh(new BoxGeometry(SHOULDER_W, SHOULDER_H, SHOULDER_D), buildMat(BOSS_COLORS.shoulder))
  shR.position.set(BODY_W / 2 + 2, SHOULDER, 0)
  group.add(shR)

  // Arms (pivot at shoulder)
  const lArm = buildLimb(ARM_W, ARM_H, ARM_D, BOSS_COLORS.arm, 'leftArm')
  lArm.position.set(-(BODY_W / 2 + ARM_W / 2), SHOULDER, 0)
  group.add(lArm)

  const rArm = buildLimb(ARM_W, ARM_H, ARM_D, BOSS_COLORS.arm, 'rightArm')
  rArm.position.set(BODY_W / 2 + ARM_W / 2, SHOULDER, 0)
  group.add(rArm)

  // Claws (children of arms)
  const clawGeo = new BoxGeometry(3, 4, 3)
  const clawMat = buildMat(BOSS_COLORS.claw)
  const lClaw = new Mesh(clawGeo.clone(), clawMat)
  lClaw.position.y = -ARM_H
  lArm.add(lClaw)
  const rClaw = new Mesh(clawGeo, clawMat)
  rClaw.position.y = -ARM_H
  rArm.add(rClaw)

  // Legs (pivot at hip)
  const lLeg = buildLimb(LEG_W, LEG_H, LEG_D, BOSS_COLORS.leg, 'leftLeg')
  lLeg.position.set(-BODY_W / 4, LEG_TOP, 0)
  group.add(lLeg)

  const rLeg = buildLimb(LEG_W, LEG_H, LEG_D, BOSS_COLORS.leg, 'rightLeg')
  rLeg.position.set(BODY_W / 4, LEG_TOP, 0)
  group.add(rLeg)

  // Feet (children of legs)
  const footGeo = new BoxGeometry(LEG_W + 2, 3, LEG_D + 2)
  const footMat = buildMat(BOSS_COLORS.foot)
  const lFoot = new Mesh(footGeo.clone(), footMat)
  lFoot.position.y = -LEG_H
  lLeg.add(lFoot)
  const rFoot = new Mesh(footGeo, footMat)
  rFoot.position.y = -LEG_H
  rLeg.add(rFoot)

  return group
}
