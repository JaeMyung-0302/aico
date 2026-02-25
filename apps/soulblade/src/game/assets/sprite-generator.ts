/**
 * 순수 Canvas2D 스프라이트 생성기
 * Phaser BootScene의 프로시저럴 텍스처 생성을 이식
 *
 * 4클래스 플레이어 (32x48, 5프레임), 몬스터 (24x24), 엘리트 (32x32),
 * 보스 (48x64), 투사체 (16x6)
 *
 * Three.js CanvasTexture로 직접 사용 가능
 */

import { CanvasTexture, NearestFilter, ClampToEdgeWrapping } from 'three'
import type { Texture } from 'three'
import type { CharacterClass } from '@soulblade/shared'

// ── Canvas2D 유틸 ──

const createCanvas = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

const colorToCSS = (hex: number, alpha = 1): string => {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return alpha < 1
    ? `rgba(${r},${g},${b},${alpha})`
    : `rgb(${r},${g},${b})`
}

const fillCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

const fillRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
  ctx.fillRect(x, y, w, h)
}

const fillRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

const fillTriangle = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void => {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x3, y3)
  ctx.closePath()
  ctx.fill()
}

const toTexture = (canvas: HTMLCanvasElement): CanvasTexture => {
  const tex = new CanvasTexture(canvas)
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

// ── 플레이어 Spritesheet 생성 (32×48, 5프레임 = 160×48) ──

const FRAME_W = 32
const FRAME_H = 48
const FRAME_COUNT = 5

// 전사 스프라이트 시트
const generateWarrior = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(FRAME_W * FRAME_COUNT, FRAME_H)

  const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
    g.fillStyle = colorToCSS(0x666666); fillCircle(g, ox + 16, 8, 7)
    g.fillStyle = colorToCSS(0x888888); fillRect(g, ox + 10, 2, 12, 3)
    g.fillStyle = colorToCSS(0x222222); fillRect(g, ox + 12, 7, 8, 2)
    g.fillStyle = colorToCSS(0x556677); fillRoundedRect(g, ox + 8, 15, 16, 14, 2)
    g.fillStyle = colorToCSS(0x667788); fillRect(g, ox + 12, 16, 8, 12)
    g.fillStyle = colorToCSS(0x778899)
    fillRoundedRect(g, ox + 4, 14, 8, 6, 2); fillRoundedRect(g, ox + 20, 14, 8, 6, 2)
    g.fillStyle = colorToCSS(0x445566)
    fillRoundedRect(g, ox + 3, 20, 6, 10, 1)
    g.fillStyle = colorToCSS(0x8899aa); fillRect(g, ox + 4, 21, 4, 8)
    const lS = walkPhase === 1 ? -3 : walkPhase === 2 ? 3 : 0
    const rS = walkPhase === 1 ? 3 : walkPhase === 2 ? -3 : 0
    g.fillStyle = colorToCSS(0x445566)
    fillRoundedRect(g, ox + 10, 29 + lS, 5, 12, 1); fillRoundedRect(g, ox + 17, 29 + rS, 5, 12, 1)
    g.fillStyle = colorToCSS(0x554433)
    fillRoundedRect(g, ox + 9, 38 + lS, 7, 5, 1); fillRoundedRect(g, ox + 16, 38 + rS, 7, 5, 1)
  }

  // Frame 0: idle
  drawBody(0)
  g.fillStyle = colorToCSS(0x445566); fillRoundedRect(g, 23, 20, 5, 8, 1)
  g.fillStyle = colorToCSS(0xccccdd); fillRect(g, 25, 12, 2, 14)
  g.fillStyle = colorToCSS(0x886633); fillRect(g, 23, 25, 6, 2)
  // Frame 1: attack up
  drawBody(FRAME_W)
  g.fillStyle = colorToCSS(0x445566); fillRoundedRect(g, FRAME_W + 22, 14, 5, 8, 1)
  g.fillStyle = colorToCSS(0xccccdd); fillRect(g, FRAME_W + 24, 4, 2, 14)
  g.fillStyle = colorToCSS(0x886633); fillRect(g, FRAME_W + 22, 17, 6, 2)
  // Frame 2: attack slash
  drawBody(FRAME_W * 2)
  g.fillStyle = colorToCSS(0x445566); fillRoundedRect(g, FRAME_W * 2 + 22, 20, 8, 5, 1)
  g.fillStyle = colorToCSS(0xccccdd); fillRect(g, FRAME_W * 2 + 20, 21, 12, 2)
  g.fillStyle = colorToCSS(0x886633); fillRect(g, FRAME_W * 2 + 20, 19, 2, 6)
  // Frame 3-4: walk
  drawBody(FRAME_W * 3, 1)
  g.fillStyle = colorToCSS(0x445566); fillRoundedRect(g, FRAME_W * 3 + 23, 20, 5, 8, 1)
  g.fillStyle = colorToCSS(0xccccdd); fillRect(g, FRAME_W * 3 + 25, 12, 2, 14)
  g.fillStyle = colorToCSS(0x886633); fillRect(g, FRAME_W * 3 + 23, 25, 6, 2)
  drawBody(FRAME_W * 4, 2)
  g.fillStyle = colorToCSS(0x445566); fillRoundedRect(g, FRAME_W * 4 + 23, 20, 5, 8, 1)
  g.fillStyle = colorToCSS(0xccccdd); fillRect(g, FRAME_W * 4 + 25, 12, 2, 14)
  g.fillStyle = colorToCSS(0x886633); fillRect(g, FRAME_W * 4 + 23, 25, 6, 2)

  return canvas
}

// 마법사 스프라이트 시트
const generateMage = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(FRAME_W * FRAME_COUNT, FRAME_H)

  const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
    g.fillStyle = colorToCSS(0x443366); fillCircle(g, ox + 16, 8, 7)
    g.fillStyle = colorToCSS(0x332255); fillTriangle(g, ox + 10, 4, ox + 16, 0, ox + 22, 4)
    g.fillStyle = colorToCSS(0x221133); fillCircle(g, ox + 16, 9, 4)
    g.fillStyle = colorToCSS(0xaa88ff, 0.8)
    fillCircle(g, ox + 14, 8, 1.5); fillCircle(g, ox + 18, 8, 1.5)
    g.fillStyle = colorToCSS(0x443366); fillTriangle(g, ox + 6, 44, ox + 16, 15, ox + 26, 44)
    g.fillStyle = colorToCSS(0x554477); fillRect(g, ox + 13, 16, 6, 10)
    g.fillStyle = colorToCSS(0xaa8833); fillRect(g, ox + 10, 26, 12, 2)
    if (walkPhase === 1) {
      g.fillStyle = colorToCSS(0x332255)
      fillRoundedRect(g, ox + 9, 42, 5, 4, 1); fillRoundedRect(g, ox + 19, 44, 5, 3, 1)
    } else if (walkPhase === 2) {
      g.fillStyle = colorToCSS(0x332255)
      fillRoundedRect(g, ox + 9, 44, 5, 3, 1); fillRoundedRect(g, ox + 19, 42, 5, 4, 1)
    }
  }

  // Frame 0: idle
  drawBody(0)
  g.fillStyle = colorToCSS(0x443366)
  fillRoundedRect(g, 5, 20, 5, 8, 1); fillRoundedRect(g, 22, 20, 5, 8, 1)
  g.fillStyle = colorToCSS(0x886644); fillRect(g, 25, 6, 2, 34)
  g.fillStyle = colorToCSS(0xaa66ff, 0.9); fillCircle(g, 26, 5, 4)
  g.fillStyle = colorToCSS(0xcc99ff, 0.6); fillCircle(g, 26, 5, 2)
  // Frame 1: casting ready
  drawBody(FRAME_W)
  g.fillStyle = colorToCSS(0x443366)
  fillRoundedRect(g, FRAME_W + 4, 14, 5, 8, 1); fillRoundedRect(g, FRAME_W + 22, 14, 5, 8, 1)
  g.fillStyle = colorToCSS(0x886644); fillRect(g, FRAME_W + 25, 2, 2, 30)
  g.fillStyle = colorToCSS(0xcc88ff, 0.9); fillCircle(g, FRAME_W + 26, 2, 5)
  g.fillStyle = colorToCSS(0xeeccff, 0.7); fillCircle(g, FRAME_W + 26, 2, 3)
  // Frame 2: casting fire
  drawBody(FRAME_W * 2)
  g.fillStyle = colorToCSS(0x443366)
  fillRoundedRect(g, FRAME_W * 2 + 3, 18, 6, 6, 1); fillRoundedRect(g, FRAME_W * 2 + 23, 18, 6, 6, 1)
  g.fillStyle = colorToCSS(0x886644); fillRect(g, FRAME_W * 2 + 25, 4, 2, 28)
  g.fillStyle = colorToCSS(0xdd99ff, 0.9); fillCircle(g, FRAME_W * 2 + 26, 3, 6)
  g.fillStyle = colorToCSS(0xffffff, 0.5); fillCircle(g, FRAME_W * 2 + 26, 3, 3)
  // Frame 3-4: walk
  drawBody(FRAME_W * 3, 1)
  g.fillStyle = colorToCSS(0x443366)
  fillRoundedRect(g, FRAME_W * 3 + 5, 20, 5, 8, 1); fillRoundedRect(g, FRAME_W * 3 + 22, 20, 5, 8, 1)
  g.fillStyle = colorToCSS(0x886644); fillRect(g, FRAME_W * 3 + 25, 6, 2, 34)
  g.fillStyle = colorToCSS(0xaa66ff, 0.9); fillCircle(g, FRAME_W * 3 + 26, 5, 4)
  g.fillStyle = colorToCSS(0xcc99ff, 0.6); fillCircle(g, FRAME_W * 3 + 26, 5, 2)
  drawBody(FRAME_W * 4, 2)
  g.fillStyle = colorToCSS(0x443366)
  fillRoundedRect(g, FRAME_W * 4 + 5, 20, 5, 8, 1); fillRoundedRect(g, FRAME_W * 4 + 22, 20, 5, 8, 1)
  g.fillStyle = colorToCSS(0x886644); fillRect(g, FRAME_W * 4 + 25, 6, 2, 34)
  g.fillStyle = colorToCSS(0xaa66ff, 0.9); fillCircle(g, FRAME_W * 4 + 26, 5, 4)
  g.fillStyle = colorToCSS(0xcc99ff, 0.6); fillCircle(g, FRAME_W * 4 + 26, 5, 2)

  return canvas
}

// 팔라딘 스프라이트 시트
const generatePaladin = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(FRAME_W * FRAME_COUNT, FRAME_H)

  const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
    g.fillStyle = colorToCSS(0xccaa44); fillCircle(g, ox + 16, 8, 7)
    g.fillStyle = colorToCSS(0xddbb55)
    fillTriangle(g, ox + 6, 6, ox + 10, 0, ox + 12, 8)
    fillTriangle(g, ox + 20, 8, ox + 22, 0, ox + 26, 6)
    g.fillStyle = colorToCSS(0x222222); fillRect(g, ox + 12, 7, 8, 2)
    g.fillStyle = colorToCSS(0xddddee, 0.6)
    fillTriangle(g, ox + 8, 15, ox + 16, 14, ox + 24, 15)
    fillTriangle(g, ox + 5, 42, ox + 16, 15, ox + 27, 42)
    g.fillStyle = colorToCSS(0xccaa44); fillRoundedRect(g, ox + 8, 15, 16, 14, 2)
    g.fillStyle = colorToCSS(0xeedd66)
    fillRect(g, ox + 14, 17, 4, 10); fillRect(g, ox + 11, 20, 10, 3)
    g.fillStyle = colorToCSS(0xddbb55)
    fillRoundedRect(g, ox + 4, 14, 7, 6, 2); fillRoundedRect(g, ox + 21, 14, 7, 6, 2)
    g.fillStyle = colorToCSS(0xbbaa44)
    fillRoundedRect(g, ox + 4, 20, 5, 9, 1)
    const lS = walkPhase === 1 ? -3 : walkPhase === 2 ? 3 : 0
    const rS = walkPhase === 1 ? 3 : walkPhase === 2 ? -3 : 0
    fillRoundedRect(g, ox + 10, 29 + lS, 5, 11, 1); fillRoundedRect(g, ox + 17, 29 + rS, 5, 11, 1)
    g.fillStyle = colorToCSS(0xaa8833)
    fillRoundedRect(g, ox + 9, 38 + lS, 7, 5, 1); fillRoundedRect(g, ox + 16, 38 + rS, 7, 5, 1)
  }

  // Frame 0: idle
  drawBody(0)
  g.fillStyle = colorToCSS(0xbbaa44); fillRoundedRect(g, 23, 20, 5, 9, 1)
  g.fillStyle = colorToCSS(0x887733); fillRect(g, 25, 10, 2, 18)
  g.fillStyle = colorToCSS(0xccaa44); fillRect(g, 22, 8, 8, 5)
  // Frame 1: hammer up
  drawBody(FRAME_W)
  g.fillStyle = colorToCSS(0xbbaa44); fillRoundedRect(g, FRAME_W + 22, 12, 5, 8, 1)
  g.fillStyle = colorToCSS(0x887733); fillRect(g, FRAME_W + 20, 2, 2, 14)
  g.fillStyle = colorToCSS(0xccaa44); fillRect(g, FRAME_W + 17, 0, 8, 5)
  // Frame 2: hammer down
  drawBody(FRAME_W * 2)
  g.fillStyle = colorToCSS(0xbbaa44); fillRoundedRect(g, FRAME_W * 2 + 22, 22, 8, 5, 1)
  g.fillStyle = colorToCSS(0x887733); fillRect(g, FRAME_W * 2 + 24, 18, 2, 14)
  g.fillStyle = colorToCSS(0xccaa44); fillRect(g, FRAME_W * 2 + 21, 30, 8, 5)
  // Frame 3-4: walk
  drawBody(FRAME_W * 3, 1)
  g.fillStyle = colorToCSS(0xbbaa44); fillRoundedRect(g, FRAME_W * 3 + 23, 20, 5, 9, 1)
  g.fillStyle = colorToCSS(0x887733); fillRect(g, FRAME_W * 3 + 25, 10, 2, 18)
  g.fillStyle = colorToCSS(0xccaa44); fillRect(g, FRAME_W * 3 + 22, 8, 8, 5)
  drawBody(FRAME_W * 4, 2)
  g.fillStyle = colorToCSS(0xbbaa44); fillRoundedRect(g, FRAME_W * 4 + 23, 20, 5, 9, 1)
  g.fillStyle = colorToCSS(0x887733); fillRect(g, FRAME_W * 4 + 25, 10, 2, 18)
  g.fillStyle = colorToCSS(0xccaa44); fillRect(g, FRAME_W * 4 + 22, 8, 8, 5)

  return canvas
}

// 궁수 스프라이트 시트
const generateArcher = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(FRAME_W * FRAME_COUNT, FRAME_H)

  const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
    g.fillStyle = colorToCSS(0x336633); fillCircle(g, ox + 16, 8, 6)
    g.fillStyle = colorToCSS(0x447744); fillTriangle(g, ox + 13, 3, ox + 16, 0, ox + 19, 3)
    g.fillStyle = colorToCSS(0xddbb88); fillCircle(g, ox + 16, 9, 4)
    g.fillStyle = colorToCSS(0x224422)
    fillCircle(g, ox + 14, 8, 1); fillCircle(g, ox + 18, 8, 1)
    g.fillStyle = colorToCSS(0x557755); fillRoundedRect(g, ox + 10, 15, 12, 12, 2)
    g.fillStyle = colorToCSS(0x775533); fillRect(g, ox + 10, 25, 12, 2)
    g.fillStyle = colorToCSS(0x336633, 0.5)
    fillTriangle(g, ox + 8, 15, ox + 16, 14, ox + 24, 15)
    fillTriangle(g, ox + 7, 38, ox + 16, 15, ox + 25, 38)
    g.fillStyle = colorToCSS(0x557755); fillRoundedRect(g, ox + 6, 17, 4, 8, 1)
    g.fillStyle = colorToCSS(0x664422); fillRect(g, ox + 6, 16, 3, 14)
    g.fillStyle = colorToCSS(0xcccccc)
    fillRect(g, ox + 6, 14, 1, 4); fillRect(g, ox + 8, 14, 1, 3)
    const lS = walkPhase === 1 ? -3 : walkPhase === 2 ? 3 : 0
    const rS = walkPhase === 1 ? 3 : walkPhase === 2 ? -3 : 0
    g.fillStyle = colorToCSS(0x557755)
    fillRoundedRect(g, ox + 11, 27 + lS, 4, 12, 1); fillRoundedRect(g, ox + 17, 27 + rS, 4, 12, 1)
    g.fillStyle = colorToCSS(0x664422)
    fillRoundedRect(g, ox + 10, 37 + lS, 6, 5, 1); fillRoundedRect(g, ox + 16, 37 + rS, 6, 5, 1)
  }

  // Frame 0: idle (활 내린 상태)
  drawBody(0)
  g.fillStyle = colorToCSS(0x557755); fillRoundedRect(g, 22, 17, 4, 8, 1)
  g.strokeStyle = colorToCSS(0x886644); g.lineWidth = 2
  g.beginPath(); g.arc(28, 18, 14, -1.2, 1.2, false); g.stroke()
  g.strokeStyle = colorToCSS(0xcccccc, 0.8); g.lineWidth = 1
  g.beginPath(); g.moveTo(28, 5); g.lineTo(28, 31); g.stroke()
  // Frame 1: 활줄 당기기
  drawBody(FRAME_W)
  g.fillStyle = colorToCSS(0x557755); fillRoundedRect(g, FRAME_W + 22, 17, 4, 8, 1)
  g.strokeStyle = colorToCSS(0x886644); g.lineWidth = 2
  g.beginPath(); g.arc(FRAME_W + 29, 18, 12, -1.0, 1.0, false); g.stroke()
  g.strokeStyle = colorToCSS(0xcccccc, 0.8); g.lineWidth = 1
  g.beginPath(); g.moveTo(FRAME_W + 29, 7); g.lineTo(FRAME_W + 22, 18); g.lineTo(FRAME_W + 29, 29); g.stroke()
  g.fillStyle = colorToCSS(0xcccccc); fillRect(g, FRAME_W + 18, 17, 8, 1)
  g.fillStyle = colorToCSS(0xaaaaaa); fillTriangle(g, FRAME_W + 17, 16, FRAME_W + 17, 19, FRAME_W + 15, 17)
  // Frame 2: 발사 후
  drawBody(FRAME_W * 2)
  g.fillStyle = colorToCSS(0x557755); fillRoundedRect(g, FRAME_W * 2 + 22, 17, 4, 8, 1)
  g.strokeStyle = colorToCSS(0x886644); g.lineWidth = 2
  g.beginPath(); g.arc(FRAME_W * 2 + 28, 18, 14, -1.2, 1.2, false); g.stroke()
  g.strokeStyle = colorToCSS(0xcccccc, 0.8); g.lineWidth = 1
  g.beginPath(); g.moveTo(FRAME_W * 2 + 28, 5); g.lineTo(FRAME_W * 2 + 28, 31); g.stroke()
  // Frame 3-4: walk
  for (let i = 3; i <= 4; i++) {
    const ox = FRAME_W * i
    drawBody(ox, i === 3 ? 1 : 2)
    g.fillStyle = colorToCSS(0x557755); fillRoundedRect(g, ox + 22, 17, 4, 8, 1)
    g.strokeStyle = colorToCSS(0x886644); g.lineWidth = 2
    g.beginPath(); g.arc(ox + 28, 18, 14, -1.2, 1.2, false); g.stroke()
    g.strokeStyle = colorToCSS(0xcccccc, 0.8); g.lineWidth = 1
    g.beginPath(); g.moveTo(ox + 28, 5); g.lineTo(ox + 28, 31); g.stroke()
  }

  return canvas
}

// ── 몬스터 텍스처 (24×24) ──
const generateNormalMonster = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(24, 24)
  // 밝은 아웃라인 (어두운 숲 배경 대비)
  g.strokeStyle = colorToCSS(0xffaa44)
  g.lineWidth = 2
  g.beginPath(); g.arc(12, 5, 6, 0, Math.PI * 2); g.stroke()
  g.beginPath(); g.roundRect(6, 9, 12, 9, 2); g.stroke()
  // 몸체 (밝은 색상)
  g.fillStyle = colorToCSS(0xcc6633); fillCircle(g, 12, 5, 5)
  g.fillStyle = colorToCSS(0xff4400); fillCircle(g, 10, 4, 1.5); fillCircle(g, 14, 4, 1.5)
  g.fillStyle = colorToCSS(0x995522); fillRoundedRect(g, 7, 10, 10, 7, 2)
  g.fillStyle = colorToCSS(0xbb6633); fillRoundedRect(g, 3, 11, 4, 6, 1); fillRoundedRect(g, 17, 11, 4, 6, 1)
  g.fillStyle = colorToCSS(0xddbb88)
  fillTriangle(g, 2, 17, 4, 14, 5, 17); fillTriangle(g, 17, 17, 19, 14, 21, 17)
  g.fillStyle = colorToCSS(0x995522)
  fillRoundedRect(g, 8, 17, 3, 5, 1); fillRoundedRect(g, 13, 17, 3, 5, 1)
  return canvas
}

// ── 엘리트 몬스터 텍스처 (32×32) ──
const generateEliteMonster = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(32, 32)
  // 밝은 아웃라인 (어두운 숲 배경 대비)
  g.strokeStyle = colorToCSS(0xffcc33)
  g.lineWidth = 2
  g.beginPath(); g.arc(16, 9, 8, 0, Math.PI * 2); g.stroke()
  g.beginPath(); g.roundRect(7, 15, 18, 11, 2); g.stroke()
  // 뿔 (밝은 색)
  g.fillStyle = colorToCSS(0xcc8844)
  fillTriangle(g, 6, 8, 9, 0, 11, 8); fillTriangle(g, 21, 8, 23, 0, 26, 8)
  // 머리
  g.fillStyle = colorToCSS(0x996633); fillCircle(g, 16, 9, 7)
  g.fillStyle = colorToCSS(0xff6600); fillCircle(g, 13, 8, 2); fillCircle(g, 19, 8, 2)
  g.fillStyle = colorToCSS(0xffcc33); fillCircle(g, 13, 8, 1); fillCircle(g, 19, 8, 1)
  // 몸체
  g.fillStyle = colorToCSS(0x776655); fillRoundedRect(g, 8, 16, 16, 9, 2)
  g.fillStyle = colorToCSS(0x998877); fillRect(g, 14, 17, 4, 7)
  g.fillStyle = colorToCSS(0x887766)
  fillRoundedRect(g, 3, 15, 7, 5, 1); fillRoundedRect(g, 22, 15, 7, 5, 1)
  g.fillStyle = colorToCSS(0xaa9988)
  fillTriangle(g, 4, 15, 6, 11, 8, 15); fillTriangle(g, 24, 15, 26, 11, 28, 15)
  g.fillStyle = colorToCSS(0x776655)
  fillRoundedRect(g, 4, 20, 5, 7, 1); fillRoundedRect(g, 23, 20, 5, 7, 1)
  g.fillStyle = colorToCSS(0x665544)
  fillRoundedRect(g, 10, 25, 5, 6, 1); fillRoundedRect(g, 17, 25, 5, 6, 1)
  return canvas
}

// ── 보스 텍스처 (48×64) ──
const generateBossMonster = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(48, 64)
  g.fillStyle = colorToCSS(0x882211)
  fillTriangle(g, 4, 14, 10, 0, 14, 14); fillTriangle(g, 34, 14, 38, 0, 44, 14)
  g.fillStyle = colorToCSS(0x553322); fillCircle(g, 24, 14, 11)
  g.fillStyle = colorToCSS(0xaa4422)
  fillTriangle(g, 16, 8, 19, 3, 22, 8); fillTriangle(g, 26, 8, 29, 3, 32, 8)
  g.fillStyle = colorToCSS(0xff2200); fillCircle(g, 19, 13, 3); fillCircle(g, 29, 13, 3)
  g.fillStyle = colorToCSS(0xffaa00); fillCircle(g, 19, 13, 1.5); fillCircle(g, 29, 13, 1.5)
  g.fillStyle = colorToCSS(0x221100); fillRect(g, 18, 19, 12, 4)
  g.fillStyle = colorToCSS(0xccaa88)
  fillTriangle(g, 19, 19, 21, 23, 23, 19); fillTriangle(g, 25, 19, 27, 23, 29, 19)
  g.fillStyle = colorToCSS(0x443322); fillRoundedRect(g, 8, 25, 32, 20, 3)
  g.fillStyle = colorToCSS(0x665544); fillCircle(g, 24, 33, 5)
  g.fillStyle = colorToCSS(0x443322); fillCircle(g, 22, 32, 1.5); fillCircle(g, 26, 32, 1.5)
  g.fillStyle = colorToCSS(0x665544)
  fillRoundedRect(g, 2, 24, 10, 8, 2); fillRoundedRect(g, 36, 24, 10, 8, 2)
  g.fillStyle = colorToCSS(0x887766)
  fillTriangle(g, 3, 24, 7, 18, 11, 24); fillTriangle(g, 37, 24, 41, 18, 45, 24)
  g.fillStyle = colorToCSS(0x443322)
  fillRoundedRect(g, 2, 32, 8, 14, 2); fillRoundedRect(g, 38, 32, 8, 14, 2)
  g.fillStyle = colorToCSS(0xaa8866)
  fillTriangle(g, 1, 46, 5, 42, 6, 46); fillTriangle(g, 42, 46, 43, 42, 47, 46)
  g.fillStyle = colorToCSS(0x332211)
  fillRoundedRect(g, 12, 45, 8, 14, 2); fillRoundedRect(g, 28, 45, 8, 14, 2)
  g.fillStyle = colorToCSS(0x554433)
  fillRoundedRect(g, 10, 56, 12, 6, 2); fillRoundedRect(g, 26, 56, 12, 6, 2)
  return canvas
}

// ── 투사체 텍스처 (16×6) ──
const generateProjectile = (): HTMLCanvasElement => {
  const [canvas, g] = createCanvas(16, 6)
  g.fillStyle = colorToCSS(0x8b6914); fillRect(g, 2, 2, 10, 2)
  g.fillStyle = colorToCSS(0xcccccc); fillTriangle(g, 12, 0, 16, 3, 12, 6)
  g.fillStyle = colorToCSS(0xcc3333, 0.8); fillTriangle(g, 0, 0, 3, 3, 0, 6)
  return canvas
}

// ── 텍스처 캐시 (Lazy Singleton) ──

// Texture 기반 타입: CanvasTexture(프로시저럴) 또는 Texture(PNG 로드) 모두 수용
export type SpriteTextures = {
  player: Record<CharacterClass, Texture>
  monster: Texture
  elite: Texture
  boss: Texture
  projectile: Texture
}

let _cache: SpriteTextures | null = null

export const getSpriteTextures = (): SpriteTextures => {
  if (_cache) return _cache

  _cache = {
    player: {
      Warrior: toTexture(generateWarrior()),
      Mage: toTexture(generateMage()),
      Paladin: toTexture(generatePaladin()),
      Archer: toTexture(generateArcher()),
    },
    monster: toTexture(generateNormalMonster()),
    elite: toTexture(generateEliteMonster()),
    boss: toTexture(generateBossMonster()),
    projectile: toTexture(generateProjectile()),
  }

  return _cache
}

// 프레임 UV 오프셋 계산 (spritesheet에서 특정 프레임 추출)
export const SPRITE_FRAME_W = FRAME_W
export const SPRITE_FRAME_H = FRAME_H
export const SPRITE_FRAME_COUNT = FRAME_COUNT

// 프레임 인덱스: 0=idle, 1-2=attack, 3-4=walk
export const getFrameUV = (frameIndex: number): { offsetX: number; repeatX: number } => ({
  offsetX: frameIndex / FRAME_COUNT,
  repeatX: 1 / FRAME_COUNT,
})
