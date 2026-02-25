/**
 * SoulBlade Dark Fantasy 에셋 생성 스크립트
 * @napi-rs/canvas를 사용하여 다크 판타지 픽셀아트 PNG 생성
 *
 * 실행: node apps/soulblade/scripts/generate-assets.mjs
 */

import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = join(__dirname, '..', 'public', 'assets', 'sprites')

// 4배 해상도 스케일 팩터
const SCALE = 4

// ─── 유틸리티 ───

// 스케일링된 캔버스 생성: 논리적 좌표는 동일, 출력 해상도 4배
const makeCanvas = (logicalW, logicalH) => {
  const c = createCanvas(logicalW * SCALE, logicalH * SCALE)
  const ctx = c.getContext('2d')
  ctx.scale(SCALE, SCALE)
  return [c, ctx]
}

const savePng = (canvas, relPath) => {
  const fullPath = join(ASSETS_DIR, relPath)
  mkdirSync(dirname(fullPath), { recursive: true })
  const buf = canvas.toBuffer('image/png')
  writeFileSync(fullPath, buf)
  console.log(`  ✓ ${relPath} (${canvas.width}×${canvas.height})`)
}

const hex = (h) => {
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return `rgb(${r},${g},${b})`
}

const rgba = (h, a) => {
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

// 노이즈 텍스처 적용 (네이티브 해상도에서 작동)
const applyNoise = (ctx, intensity = 0.05) => {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)
  ctx.restore()
}

// 디더링 효과 (체크무늬 패턴으로 색상 블렌딩)
const dither = (ctx, x, y, w, h, color, density = 0.3) => {
  ctx.fillStyle = color
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (Math.random() < density) {
        ctx.fillRect(x + dx, y + dy, 1, 1)
      }
    }
  }
}

// ═══════════════════════════════════════════════
// 1. 배경 타일 텍스처 (512×512 @4x, tileable)
// ═══════════════════════════════════════════════

const generateBackgroundTown = () => {
  const [c, ctx] = makeCanvas(128, 128)

  // 기본 바닥: 어두운 잔디
  ctx.fillStyle = '#1e3320'
  ctx.fillRect(0, 0, 128, 128)

  // 잔디 변화 레이어
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const shade = Math.random()
    if (shade < 0.3) ctx.fillStyle = '#162a18'
    else if (shade < 0.6) ctx.fillStyle = '#243d26'
    else if (shade < 0.85) ctx.fillStyle = '#2a4a2c'
    else ctx.fillStyle = '#1a2d1c'
    ctx.fillRect(Math.floor(x), Math.floor(y), 1 + Math.floor(Math.random() * 2), 1)
  }

  // 흙 패치
  for (let i = 0; i < 8; i++) {
    const px = Math.random() * 120
    const py = Math.random() * 120
    const pw = 4 + Math.random() * 10
    const ph = 3 + Math.random() * 6
    ctx.fillStyle = rgba('#3a2e1e', 0.4 + Math.random() * 0.3)
    ctx.fillRect(px, py, pw, ph)
    dither(ctx, px, py, pw, ph, '#2a1e10', 0.15)
  }

  // 돌멩이
  for (let i = 0; i < 6; i++) {
    const sx = Math.random() * 124
    const sy = Math.random() * 124
    ctx.fillStyle = '#3a3a38'
    ctx.fillRect(sx, sy, 2 + Math.random() * 3, 2 + Math.random() * 2)
    ctx.fillStyle = '#4a4a47'
    ctx.fillRect(sx, sy, 1, 1)
  }

  // 잔디 잎사귀 (밝은 포인트)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = '#2e5530'
    const gx = Math.random() * 128
    const gy = Math.random() * 128
    ctx.fillRect(gx, gy, 1, 2)
  }

  applyNoise(ctx, 0.03)
  savePng(c, 'background/town.png')
}

const generateBackgroundSerpentForest = () => {
  const [c, ctx] = makeCanvas(128, 128)

  // 짙은 정글 바닥
  ctx.fillStyle = '#0e1f0e'
  ctx.fillRect(0, 0, 128, 128)

  // 이끼 레이어
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const shade = Math.random()
    if (shade < 0.25) ctx.fillStyle = '#0a180a'
    else if (shade < 0.5) ctx.fillStyle = '#122212'
    else if (shade < 0.75) ctx.fillStyle = '#1a2e1a'
    else ctx.fillStyle = '#0d1a0d'
    ctx.fillRect(Math.floor(x), Math.floor(y), 1 + Math.floor(Math.random() * 3), 1)
  }

  // 덩굴/뿌리 패턴
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = rgba('#1a3018', 0.6)
    ctx.lineWidth = 1
    ctx.beginPath()
    const sx = Math.random() * 128
    const sy = Math.random() * 128
    ctx.moveTo(sx, sy)
    for (let j = 0; j < 5; j++) {
      ctx.lineTo(sx + (Math.random() - 0.5) * 20, sy + Math.random() * 15)
    }
    ctx.stroke()
  }

  // 습기 웅덩이
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = rgba('#0a1a0a', 0.5)
    const px = Math.random() * 110
    const py = Math.random() * 110
    ctx.beginPath()
    ctx.ellipse(px + 6, py + 3, 6, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 독버섯 포인트
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#3a1a2a'
    const mx = Math.random() * 126
    const my = Math.random() * 126
    ctx.fillRect(mx, my, 2, 2)
    ctx.fillStyle = '#4a2a3a'
    ctx.fillRect(mx, my, 1, 1)
  }

  applyNoise(ctx, 0.04)
  savePng(c, 'background/serpent_forest.png')
}

const generateBackgroundIceCave = () => {
  const [c, ctx] = makeCanvas(128, 128)

  // 파란 얼음 바닥
  ctx.fillStyle = '#1a2a3e'
  ctx.fillRect(0, 0, 128, 128)

  // 얼음 결정 패턴
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const shade = Math.random()
    if (shade < 0.3) ctx.fillStyle = '#152535'
    else if (shade < 0.6) ctx.fillStyle = '#1e3348'
    else if (shade < 0.85) ctx.fillStyle = '#253d55'
    else ctx.fillStyle = '#2a4560'
    ctx.fillRect(Math.floor(x), Math.floor(y), 1 + Math.floor(Math.random() * 2), 1)
  }

  // 서리 결정
  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = rgba('#5a8ab0', 0.3)
    ctx.lineWidth = 1
    const cx = Math.random() * 128
    const cy = Math.random() * 128
    for (let a = 0; a < 6; a++) {
      const angle = (a / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4)
      ctx.stroke()
    }
  }

  // 반사광 포인트
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = rgba('#6a9ac0', 0.25)
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1)
  }

  // 균열 라인
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = rgba('#0e1e2e', 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    let lx = Math.random() * 128
    let ly = Math.random() * 128
    ctx.moveTo(lx, ly)
    for (let j = 0; j < 4; j++) {
      lx += (Math.random() - 0.5) * 15
      ly += Math.random() * 10
      ctx.lineTo(lx, ly)
    }
    ctx.stroke()
  }

  applyNoise(ctx, 0.03)
  savePng(c, 'background/ice_cave.png')
}

const generateBackgroundFlameCastle = () => {
  const [c, ctx] = makeCanvas(128, 128)

  // 검붉은 화산암
  ctx.fillStyle = '#1a1010'
  ctx.fillRect(0, 0, 128, 128)

  // 암석 패턴
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const shade = Math.random()
    if (shade < 0.3) ctx.fillStyle = '#1e1212'
    else if (shade < 0.6) ctx.fillStyle = '#251515'
    else if (shade < 0.85) ctx.fillStyle = '#2a1818'
    else ctx.fillStyle = '#151010'
    ctx.fillRect(Math.floor(x), Math.floor(y), 1 + Math.floor(Math.random() * 2), 1)
  }

  // 용암 균열
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = '#8a3a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    let lx = Math.random() * 128
    let ly = Math.random() * 128
    ctx.moveTo(lx, ly)
    for (let j = 0; j < 5; j++) {
      lx += (Math.random() - 0.5) * 12
      ly += Math.random() * 10
      ctx.lineTo(lx, ly)
    }
    ctx.stroke()
    // 빛나는 코어
    ctx.strokeStyle = rgba('#cc6630', 0.5)
    ctx.stroke()
  }

  // 재 조각
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rgba('#2e2020', 0.4)
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1)
  }

  // 열기 포인트 (밝은 점)
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = rgba('#aa5a30', 0.15)
    const hx = Math.random() * 126
    const hy = Math.random() * 126
    ctx.fillRect(hx, hy, 2, 2)
  }

  applyNoise(ctx, 0.04)
  savePng(c, 'background/flame_castle.png')
}

// ═══════════════════════════════════════════════
// 2. 캐릭터 스프라이트시트 (640×192 @4x, 5프레임)
// ═══════════════════════════════════════════════

// 공통: 인간형 캐릭터 그리기 (32×48 단일 프레임)
const drawHumanoid = (ctx, ox, oy, palette) => {
  const {
    skin, hair, eyeColor,
    torso, torso2, pants, boots,
    weapon, weaponHighlight, shield,
    helmet, helmetHighlight, cape,
  } = palette

  // 다리/부츠 (하체)
  ctx.fillStyle = pants
  ctx.fillRect(ox + 12, oy + 32, 4, 8) // 왼다리
  ctx.fillRect(ox + 17, oy + 32, 4, 8) // 오른다리
  ctx.fillStyle = boots
  ctx.fillRect(ox + 11, oy + 40, 5, 4) // 왼부츠
  ctx.fillRect(ox + 16, oy + 40, 5, 4) // 오른부츠
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(ox + 11, oy + 44, 5, 1) // 부츠 밑창
  ctx.fillRect(ox + 16, oy + 44, 5, 1)

  // 몸통
  ctx.fillStyle = torso
  ctx.fillRect(ox + 10, oy + 18, 12, 14)
  ctx.fillStyle = torso2
  ctx.fillRect(ox + 11, oy + 19, 10, 2) // 어깨
  ctx.fillRect(ox + 12, oy + 24, 8, 3) // 벨트 영역

  // 팔
  ctx.fillStyle = torso
  ctx.fillRect(ox + 7, oy + 19, 3, 10) // 왼팔
  ctx.fillRect(ox + 22, oy + 19, 3, 10) // 오른팔
  ctx.fillStyle = skin
  ctx.fillRect(ox + 7, oy + 29, 3, 2) // 왼손
  ctx.fillRect(ox + 22, oy + 29, 3, 2) // 오른손

  // 머리
  ctx.fillStyle = skin
  ctx.fillRect(ox + 12, oy + 8, 8, 10)
  // 눈
  ctx.fillStyle = eyeColor || '#ffffff'
  ctx.fillRect(ox + 13, oy + 12, 2, 2)
  ctx.fillRect(ox + 17, oy + 12, 2, 2)
  ctx.fillStyle = '#000000'
  ctx.fillRect(ox + 14, oy + 12, 1, 1)
  ctx.fillRect(ox + 18, oy + 12, 1, 1)
  // 머리카락
  ctx.fillStyle = hair
  ctx.fillRect(ox + 11, oy + 6, 10, 4)
  ctx.fillRect(ox + 11, oy + 8, 2, 4) // 옆머리 왼
  ctx.fillRect(ox + 19, oy + 8, 2, 4) // 옆머리 오른

  // 헬멧/모자
  if (helmet) {
    ctx.fillStyle = helmet
    ctx.fillRect(ox + 10, oy + 5, 12, 5)
    if (helmetHighlight) {
      ctx.fillStyle = helmetHighlight
      ctx.fillRect(ox + 11, oy + 6, 10, 1)
    }
  }

  // 망토
  if (cape) {
    ctx.fillStyle = cape
    ctx.fillRect(ox + 10, oy + 18, 2, 16)
    ctx.fillRect(ox + 20, oy + 18, 2, 16)
    ctx.fillRect(ox + 9, oy + 28, 3, 10)
    ctx.fillRect(ox + 20, oy + 28, 3, 10)
  }

  // 무기
  if (weapon) {
    ctx.fillStyle = weapon
    // 기본: 오른손 무기
    ctx.fillRect(ox + 24, oy + 14, 2, 16)
    if (weaponHighlight) {
      ctx.fillStyle = weaponHighlight
      ctx.fillRect(ox + 24, oy + 14, 2, 2)
    }
  }

  // 방패
  if (shield) {
    ctx.fillStyle = shield
    ctx.fillRect(ox + 4, oy + 20, 4, 8)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(ox + 5, oy + 23, 2, 2)
  }
}

// 워크 사이클 변형: 프레임별 다리 위치 조정
const drawHumanoidFrame = (ctx, frameIdx, ox, oy, palette) => {
  // 기본 그리기
  drawHumanoid(ctx, ox, oy, palette)

  // 프레임별 변형 (다리 움직임)
  const legOffsets = [0, -2, 0, 2, 0]
  const offset = legOffsets[frameIdx] || 0

  // 다리 위치 살짝 변경으로 걷는 느낌
  if (offset !== 0) {
    ctx.fillStyle = palette.pants
    ctx.fillRect(ox + 12, oy + 32 + offset, 4, 1)
    ctx.fillRect(ox + 17, oy + 32 - offset, 4, 1)
  }

  // 프레임 2, 4: 무기 각도 변화 (공격 모션 힌트)
  if (frameIdx === 2 && palette.weapon) {
    ctx.fillStyle = palette.weapon
    ctx.fillRect(ox + 24, oy + 12, 3, 3) // 무기 올리기
  }
}

const generatePlayerWarrior = () => {
  const [c, ctx] = makeCanvas(160, 48)

  const palette = {
    skin: '#c8a882',
    hair: '#3a2a1a',
    eyeColor: '#e0e0e0',
    torso: '#5a5a5a',   // 강철 갑옷
    torso2: '#707070',  // 갑옷 하이라이트
    pants: '#3a3a3a',
    boots: '#2a2218',
    weapon: '#a0a0a0',  // 장검
    weaponHighlight: '#d0d0d0',
    shield: '#6a4a2a',  // 나무 방패
    helmet: '#5a5a5a',
    helmetHighlight: '#808080',
  }

  for (let i = 0; i < 5; i++) {
    drawHumanoidFrame(ctx, i, i * 32, 0, palette)
  }

  savePng(c, 'player/warrior.png')
}

const generatePlayerMage = () => {
  const [c, ctx] = makeCanvas(160, 48)

  const palette = {
    skin: '#c8a882',
    hair: '#8a8aaa',  // 은발
    eyeColor: '#8ab8ff',
    torso: '#2a2050',   // 짙은 보라 로브
    torso2: '#3a3068',
    pants: '#1a1840',
    boots: '#2a2040',
    weapon: '#6a4a2a',  // 지팡이
    weaponHighlight: '#4a8aff', // 빛나는 보석
    cape: '#2a1850',
  }

  for (let i = 0; i < 5; i++) {
    drawHumanoidFrame(ctx, i, i * 32, 0, palette)
    // 마법사 모자
    const ox = i * 32
    ctx.fillStyle = '#2a2050'
    ctx.fillRect(ox + 10, oy(3), 12, 3)
    ctx.fillRect(ox + 12, oy(0), 8, 3)
    ctx.fillRect(ox + 14, oy(-2), 4, 2)
    // 보석
    ctx.fillStyle = '#4a8aff'
    ctx.fillRect(ox + 15, oy(1), 2, 2)
  }

  savePng(c, 'player/mage.png')
}

// oy 헬퍼를 외부로 분리 (머리 위 좌표)
function oy(offset) { return 5 + offset }

const generatePlayerPaladin = () => {
  const [c, ctx] = makeCanvas(160, 48)

  const palette = {
    skin: '#c8a882',
    hair: '#c8a848',  // 금발
    eyeColor: '#e0e0e0',
    torso: '#c8b870',   // 금색 갑옷
    torso2: '#d8c880',
    pants: '#8a7a50',
    boots: '#5a4a2a',
    weapon: '#aaaaaa',  // 메이스
    weaponHighlight: '#ffdd66',
    shield: '#c8b870',
    helmet: '#c8b870',
    helmetHighlight: '#e8d890',
    cape: '#eeeeee',
  }

  for (let i = 0; i < 5; i++) {
    drawHumanoidFrame(ctx, i, i * 32, 0, palette)
    // 성스러운 심볼
    const ox = i * 32
    ctx.fillStyle = '#ffdd66'
    ctx.fillRect(ox + 14, oy(22) + 1, 4, 1)
    ctx.fillRect(ox + 15, oy(22), 2, 3)
  }

  savePng(c, 'player/paladin.png')
}

const generatePlayerArcher = () => {
  const [c, ctx] = makeCanvas(160, 48)

  const palette = {
    skin: '#c8a882',
    hair: '#2a4a2a', // 짙은 녹색
    eyeColor: '#88cc88',
    torso: '#3a5a3a',   // 가죽 + 녹색
    torso2: '#4a6a4a',
    pants: '#3a3a2a',
    boots: '#2a2a18',
    weapon: '#5a3a1a',  // 나무 활
    cape: '#2a4a2a',
  }

  for (let i = 0; i < 5; i++) {
    drawHumanoidFrame(ctx, i, i * 32, 0, palette)
    // 활 그리기 (오른쪽)
    const ox = i * 32
    ctx.strokeStyle = '#5a3a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ox + 25, oy(14))
    ctx.quadraticCurveTo(ox + 28, oy(22), ox + 25, oy(30))
    ctx.stroke()
    // 시위
    ctx.strokeStyle = '#8a8a7a'
    ctx.beginPath()
    ctx.moveTo(ox + 25, oy(14))
    ctx.lineTo(ox + 25, oy(30))
    ctx.stroke()
    // 화살통
    ctx.fillStyle = '#4a3a2a'
    ctx.fillRect(ox + 8, oy(18), 3, 12)
  }

  savePng(c, 'player/archer.png')
}

// ═══════════════════════════════════════════════
// 3. 몬스터/보스 스프라이트
// ═══════════════════════════════════════════════

const generateMonsterNormal = () => {
  const [c, ctx] = makeCanvas(24, 24)

  // 스켈레톤 형상
  // 몸통 (뼈)
  ctx.fillStyle = '#8a8a7a'
  ctx.fillRect(9, 6, 6, 8) // 갈비뼈
  ctx.fillStyle = '#9a9a8a'
  ctx.fillRect(10, 7, 4, 6)

  // 머리 (해골)
  ctx.fillStyle = '#aaaaaa'
  ctx.fillRect(8, 1, 8, 6)
  ctx.fillStyle = '#c0c0b0'
  ctx.fillRect(9, 2, 6, 4)
  // 눈구멍
  ctx.fillStyle = '#cc3333'
  ctx.fillRect(9, 3, 2, 2)
  ctx.fillRect(13, 3, 2, 2)
  // 이빨
  ctx.fillStyle = '#ccccbb'
  ctx.fillRect(10, 6, 1, 1)
  ctx.fillRect(12, 6, 1, 1)
  ctx.fillRect(13, 6, 1, 1)

  // 팔
  ctx.fillStyle = '#8a8a7a'
  ctx.fillRect(6, 7, 3, 6)  // 왼팔
  ctx.fillRect(15, 7, 3, 6) // 오른팔

  // 다리
  ctx.fillStyle = '#7a7a6a'
  ctx.fillRect(9, 14, 3, 6)
  ctx.fillRect(12, 14, 3, 6)
  ctx.fillStyle = '#6a6a5a'
  ctx.fillRect(9, 20, 3, 2)
  ctx.fillRect(12, 20, 3, 2)

  // 무기 (녹슨 검)
  ctx.fillStyle = '#6a5a4a'
  ctx.fillRect(17, 4, 2, 10)
  ctx.fillStyle = '#5a4a3a'
  ctx.fillRect(16, 8, 4, 2) // 가드

  savePng(c, 'monster/normal.png')
}

const generateMonsterElite = () => {
  const [c, ctx] = makeCanvas(32, 32)

  // 거대 골렘/변이체
  // 몸통
  ctx.fillStyle = '#4a3a4a'
  ctx.fillRect(10, 10, 12, 12)
  ctx.fillStyle = '#5a4a5a'
  ctx.fillRect(11, 11, 10, 10)

  // 어깨/갑옷
  ctx.fillStyle = '#3a2a3a'
  ctx.fillRect(7, 10, 5, 6) // 왼어깨
  ctx.fillRect(20, 10, 5, 6) // 오른어깨
  ctx.fillStyle = '#6a3a3a'
  ctx.fillRect(8, 11, 3, 2) // 붉은 장식
  ctx.fillRect(21, 11, 3, 2)

  // 머리
  ctx.fillStyle = '#5a5a5a'
  ctx.fillRect(11, 3, 10, 8)
  ctx.fillStyle = '#6a6a6a'
  ctx.fillRect(12, 4, 8, 6)
  // 빛나는 눈
  ctx.fillStyle = '#ff4444'
  ctx.fillRect(13, 5, 3, 2)
  ctx.fillRect(18, 5, 3, 2)
  ctx.fillStyle = '#ff8888'
  ctx.fillRect(14, 5, 1, 1)
  ctx.fillRect(19, 5, 1, 1)
  // 뿔
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(11, 1, 2, 4)
  ctx.fillRect(19, 1, 2, 4)

  // 다리
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(10, 22, 5, 7)
  ctx.fillRect(17, 22, 5, 7)
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(10, 29, 5, 2)
  ctx.fillRect(17, 29, 5, 2)

  // 팔
  ctx.fillStyle = '#4a3a4a'
  ctx.fillRect(5, 12, 4, 12)
  ctx.fillRect(23, 12, 4, 12)

  // 어두운 오라 (가장자리)
  dither(ctx, 3, 3, 26, 26, rgba('#2a1a3a', 0.3), 0.08)

  savePng(c, 'monster/elite.png')
}

const generateMonsterBoss = () => {
  const [c, ctx] = makeCanvas(64, 64)

  // 거대 마왕/데몬
  // 몸통
  ctx.fillStyle = '#2a1a2a'
  ctx.fillRect(18, 22, 28, 24)
  ctx.fillStyle = '#3a2a3a'
  ctx.fillRect(20, 24, 24, 20)

  // 가슴 문양
  ctx.fillStyle = '#5a2a2a'
  ctx.fillRect(26, 28, 12, 8)
  ctx.fillStyle = '#8a3a3a'
  ctx.fillRect(28, 30, 8, 4)
  ctx.fillStyle = '#cc5533'
  ctx.fillRect(30, 31, 4, 2) // 빛나는 코어

  // 어깨
  ctx.fillStyle = '#3a2a2a'
  ctx.fillRect(10, 22, 10, 10)
  ctx.fillRect(44, 22, 10, 10)
  // 스파이크
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(12, 18, 3, 6)
  ctx.fillRect(15, 20, 3, 4)
  ctx.fillRect(46, 18, 3, 6)
  ctx.fillRect(49, 20, 3, 4)

  // 머리
  ctx.fillStyle = '#3a2a2a'
  ctx.fillRect(22, 8, 20, 16)
  ctx.fillStyle = '#4a3a3a'
  ctx.fillRect(24, 10, 16, 12)

  // 거대 뿔
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(20, 2, 4, 10)
  ctx.fillRect(18, 0, 4, 6)
  ctx.fillRect(40, 2, 4, 10)
  ctx.fillRect(42, 0, 4, 6)
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(21, 3, 2, 8)
  ctx.fillRect(41, 3, 2, 8)

  // 눈 (빛나는 적색)
  ctx.fillStyle = '#ff2200'
  ctx.fillRect(26, 13, 5, 3)
  ctx.fillRect(35, 13, 5, 3)
  ctx.fillStyle = '#ff6644'
  ctx.fillRect(27, 14, 3, 1)
  ctx.fillRect(36, 14, 3, 1)
  // 눈 발광
  ctx.fillStyle = rgba('#ff4422', 0.3)
  ctx.fillRect(24, 12, 9, 5)
  ctx.fillRect(33, 12, 9, 5)

  // 입
  ctx.fillStyle = '#1a0a0a'
  ctx.fillRect(26, 18, 12, 3)
  ctx.fillStyle = '#ccccbb'
  ctx.fillRect(27, 18, 2, 2) // 송곳니
  ctx.fillRect(35, 18, 2, 2)

  // 팔
  ctx.fillStyle = '#2a1a2a'
  ctx.fillRect(6, 24, 6, 20)
  ctx.fillRect(52, 24, 6, 20)
  // 손/발톱
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(6, 44, 7, 3)
  ctx.fillRect(51, 44, 7, 3)
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(5, 44, 2, 4)
  ctx.fillRect(12, 44, 2, 4)
  ctx.fillRect(50, 44, 2, 4)
  ctx.fillRect(57, 44, 2, 4)

  // 다리
  ctx.fillStyle = '#2a1a2a'
  ctx.fillRect(20, 46, 8, 14)
  ctx.fillRect(36, 46, 8, 14)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(18, 58, 10, 4)
  ctx.fillRect(36, 58, 10, 4)

  // 날개 (간략한 실루엣)
  ctx.fillStyle = rgba('#1a0a1a', 0.6)
  // 왼쪽 날개
  ctx.fillRect(2, 10, 16, 3)
  ctx.fillRect(0, 12, 12, 3)
  ctx.fillRect(0, 15, 8, 2)
  // 오른쪽 날개
  ctx.fillRect(46, 10, 16, 3)
  ctx.fillRect(52, 12, 12, 3)
  ctx.fillRect(56, 15, 8, 2)

  // 어두운 오라
  dither(ctx, 0, 0, 64, 64, rgba('#3a0a2a', 0.2), 0.06)

  savePng(c, 'monster/boss.png')
}

// ═══════════════════════════════════════════════
// 4. NPC 건물 스프라이트
// ═══════════════════════════════════════════════

const generateNpcShop = () => {
  const [c, ctx] = makeCanvas(64, 96)

  // 건물 본체 (나무 + 돌)
  ctx.fillStyle = '#3a3028'
  ctx.fillRect(8, 30, 48, 50)
  ctx.fillStyle = '#4a4038'
  ctx.fillRect(10, 32, 44, 46)

  // 벽돌 패턴
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const bx = 10 + col * 7 + (row % 2 ? 3 : 0)
      const by = 32 + row * 6
      ctx.fillStyle = row % 2 ? '#4a3a30' : '#3e3228'
      ctx.fillRect(bx, by, 6, 5)
    }
  }

  // 지붕 (삼각형)
  ctx.fillStyle = '#5a2a1a'
  for (let i = 0; i < 20; i++) {
    const w = 52 - i * 2.4
    const x = 6 + i * 1.2
    ctx.fillRect(x, 12 + i, w, 1)
  }
  ctx.fillStyle = '#6a3a2a'
  for (let i = 0; i < 18; i++) {
    const w = 48 - i * 2.4
    const x = 8 + i * 1.2
    ctx.fillRect(x, 13 + i, w, 1)
  }
  // 지붕꼭대기 장식
  ctx.fillStyle = '#cc9944'
  ctx.fillRect(30, 8, 4, 6)
  ctx.fillRect(29, 10, 6, 2)

  // 문
  ctx.fillStyle = '#2a1a10'
  ctx.fillRect(24, 58, 16, 22)
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(25, 59, 14, 20)
  // 문 손잡이
  ctx.fillStyle = '#ccaa44'
  ctx.fillRect(36, 68, 2, 2)
  // 문 테두리
  ctx.fillStyle = '#4a3a2a'
  ctx.fillRect(24, 58, 1, 22)
  ctx.fillRect(39, 58, 1, 22)
  ctx.fillRect(24, 58, 16, 1)

  // 창문
  ctx.fillStyle = '#2a3a5a'
  ctx.fillRect(12, 40, 8, 8)
  ctx.fillRect(44, 40, 8, 8)
  // 창문 빛
  ctx.fillStyle = rgba('#ffcc66', 0.4)
  ctx.fillRect(13, 41, 6, 6)
  ctx.fillRect(45, 41, 6, 6)
  // 창살
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(15, 40, 1, 8)
  ctx.fillRect(12, 43, 8, 1)
  ctx.fillRect(47, 40, 1, 8)
  ctx.fillRect(44, 43, 8, 1)

  // 간판
  ctx.fillStyle = '#5a4a2a'
  ctx.fillRect(14, 54, 12, 6)
  ctx.fillStyle = '#ccaa44'
  ctx.fillRect(16, 55, 8, 4)
  // 간판 텍스트 힌트
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(17, 56, 2, 2)
  ctx.fillRect(20, 56, 2, 2)

  // 차양 (awning)
  ctx.fillStyle = '#8a2a2a'
  ctx.fillRect(10, 52, 44, 3)
  ctx.fillStyle = '#6a1a1a'
  ctx.fillRect(10, 54, 44, 1)
  // 줄무늬
  for (let i = 0; i < 22; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = '#aa3a2a'
      ctx.fillRect(10 + i * 2, 52, 2, 2)
    }
  }

  // 기단
  ctx.fillStyle = '#4a4a48'
  ctx.fillRect(6, 78, 52, 4)

  // 그림자
  ctx.fillStyle = rgba('#000000', 0.15)
  ctx.fillRect(4, 82, 56, 8)

  savePng(c, 'npc/shop.png')
}

const generateNpcBlacksmith = () => {
  const [c, ctx] = makeCanvas(64, 96)

  // 건물 본체 (돌 벽)
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(6, 28, 52, 52)
  ctx.fillStyle = '#4a4a48'
  ctx.fillRect(8, 30, 48, 48)

  // 돌 벽돌 패턴
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const bx = 8 + col * 8 + (row % 2 ? 4 : 0)
      const by = 30 + row * 6
      ctx.fillStyle = (row + col) % 3 === 0 ? '#505050' : '#424242'
      ctx.fillRect(bx, by, 7, 5)
    }
  }

  // 지붕 (평지붕 + 굴뚝)
  ctx.fillStyle = '#3a2a20'
  ctx.fillRect(4, 24, 56, 6)
  ctx.fillStyle = '#4a3a28'
  ctx.fillRect(6, 25, 52, 4)
  // 지붕 테두리
  ctx.fillStyle = '#2a1a10'
  ctx.fillRect(4, 24, 56, 1)

  // 굴뚝
  ctx.fillStyle = '#3a3a38'
  ctx.fillRect(44, 8, 10, 18)
  ctx.fillStyle = '#4a4a46'
  ctx.fillRect(45, 10, 8, 14)
  // 연기
  ctx.fillStyle = rgba('#8a8a8a', 0.3)
  ctx.fillRect(46, 3, 6, 6)
  ctx.fillStyle = rgba('#aaaaaa', 0.2)
  ctx.fillRect(47, 0, 4, 5)

  // 대형 문 (작업장 개방형)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(18, 50, 20, 28)
  ctx.fillStyle = '#2a2020'
  ctx.fillRect(19, 51, 18, 26)

  // 화로 (문 안쪽)
  ctx.fillStyle = '#aa4422'
  ctx.fillRect(24, 60, 10, 8)
  ctx.fillStyle = '#cc6633'
  ctx.fillRect(25, 61, 8, 6)
  ctx.fillStyle = '#ffaa44'
  ctx.fillRect(26, 62, 6, 4)
  ctx.fillStyle = '#ffcc66'
  ctx.fillRect(27, 63, 4, 2)

  // 모루 (문 앞)
  ctx.fillStyle = '#5a5a5a'
  ctx.fillRect(38, 72, 10, 3) // 상부
  ctx.fillRect(40, 75, 6, 3)  // 하부

  // 창문 (화로 빛 반사)
  ctx.fillStyle = '#2a3a4a'
  ctx.fillRect(8, 36, 8, 8)
  ctx.fillStyle = rgba('#ffaa44', 0.3)
  ctx.fillRect(9, 37, 6, 6)
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(11, 36, 1, 8)
  ctx.fillRect(8, 39, 8, 1)

  // 무기 진열 (벽)
  ctx.fillStyle = '#888888'
  ctx.fillRect(10, 50, 2, 10)
  ctx.fillRect(13, 52, 2, 8)
  ctx.fillStyle = '#aaaaaa'
  ctx.fillRect(10, 50, 2, 1)
  ctx.fillRect(13, 52, 2, 1)

  // 기단
  ctx.fillStyle = '#3a3a38'
  ctx.fillRect(4, 78, 56, 4)

  // 그림자
  ctx.fillStyle = rgba('#000000', 0.15)
  ctx.fillRect(2, 82, 60, 8)

  savePng(c, 'npc/blacksmith.png')
}

const generateNpcPortalGuide = () => {
  const [c, ctx] = makeCanvas(48, 80)

  // 기단 (hexagonal stone)
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(10, 58, 28, 12)
  ctx.fillStyle = '#4a4a4a'
  ctx.fillRect(12, 60, 24, 8)
  // 단 라인
  ctx.fillStyle = '#5a5a58'
  ctx.fillRect(12, 60, 24, 1)
  ctx.fillRect(12, 64, 24, 1)

  // 기둥 (마법 비석)
  ctx.fillStyle = '#3a3a4a'
  ctx.fillRect(18, 16, 12, 44)
  ctx.fillStyle = '#4a4a5a'
  ctx.fillRect(19, 18, 10, 40)

  // 룬 문양
  ctx.fillStyle = '#6a8acc'
  ctx.fillRect(21, 22, 6, 1)
  ctx.fillRect(23, 24, 2, 4)
  ctx.fillRect(21, 29, 6, 1)
  ctx.fillRect(21, 33, 2, 6)
  ctx.fillRect(25, 33, 2, 6)
  ctx.fillRect(21, 39, 6, 1)
  ctx.fillRect(23, 42, 2, 4)

  // 꼭대기 보석
  ctx.fillStyle = '#4488ff'
  ctx.fillRect(20, 10, 8, 8)
  ctx.fillStyle = '#66aaff'
  ctx.fillRect(21, 11, 6, 6)
  ctx.fillStyle = '#88ccff'
  ctx.fillRect(22, 12, 4, 4)
  ctx.fillStyle = '#aaeeff'
  ctx.fillRect(23, 13, 2, 2)

  // 발광 효과 (가장자리)
  ctx.fillStyle = rgba('#4488ff', 0.15)
  ctx.fillRect(14, 6, 20, 16)
  ctx.fillStyle = rgba('#4488ff', 0.08)
  ctx.fillRect(10, 2, 28, 24)

  // 룬 빛남 효과
  dither(ctx, 18, 16, 12, 44, rgba('#6a8acc', 0.15), 0.08)

  // 기단 그림자
  ctx.fillStyle = rgba('#000000', 0.15)
  ctx.fillRect(8, 70, 32, 6)

  savePng(c, 'npc/portal_guide.png')
}

// ═══════════════════════════════════════════════
// 5. 장애물 스프라이트
// ═══════════════════════════════════════════════

const generateTree01 = () => {
  const [c, ctx] = makeCanvas(32, 48)

  // 나무 줄기
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(13, 24, 6, 20)
  ctx.fillStyle = '#4a3a2a'
  ctx.fillRect(14, 25, 4, 18)
  // 줄기 질감
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(14, 28, 1, 3)
  ctx.fillRect(16, 32, 1, 4)
  ctx.fillRect(15, 38, 1, 3)

  // 뿌리
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(10, 42, 4, 3)
  ctx.fillRect(18, 42, 4, 3)
  ctx.fillRect(11, 44, 10, 2)

  // 캐노피 (dark canopy)
  const canopyColor = '#1a3a1a'
  const canopyLight = '#2a4a2a'
  const canopyDark = '#0a2a0a'

  // 하단 잎
  ctx.fillStyle = canopyColor
  ctx.fillRect(4, 14, 24, 12)
  ctx.fillStyle = canopyLight
  ctx.fillRect(6, 16, 20, 8)

  // 상단 잎
  ctx.fillStyle = canopyColor
  ctx.fillRect(6, 6, 20, 10)
  ctx.fillStyle = canopyLight
  ctx.fillRect(8, 8, 16, 6)

  // 꼭대기
  ctx.fillStyle = canopyColor
  ctx.fillRect(10, 2, 12, 6)
  ctx.fillStyle = canopyLight
  ctx.fillRect(12, 3, 8, 4)

  // 잎 디테일
  ctx.fillStyle = canopyDark
  ctx.fillRect(5, 20, 3, 3)
  ctx.fillRect(22, 18, 4, 3)
  ctx.fillRect(8, 10, 3, 2)
  ctx.fillRect(20, 8, 3, 3)

  // 밝은 하이라이트 (햇빛)
  ctx.fillStyle = '#3a5a3a'
  ctx.fillRect(14, 4, 4, 2)
  ctx.fillRect(10, 9, 3, 2)

  // 그림자
  ctx.fillStyle = rgba('#000000', 0.12)
  ctx.fillRect(8, 44, 16, 3)

  savePng(c, 'obstacle/tree_01.png')
}

const generateTree02 = () => {
  const [c, ctx] = makeCanvas(32, 48)

  // 다른 형태의 나무 (침엽수/뾰족한 형)
  // 줄기
  ctx.fillStyle = '#2a2018'
  ctx.fillRect(14, 28, 4, 16)
  ctx.fillStyle = '#3a3020'
  ctx.fillRect(14, 30, 4, 12)

  // 뿌리
  ctx.fillStyle = '#2a2018'
  ctx.fillRect(12, 42, 3, 3)
  ctx.fillRect(17, 42, 3, 3)

  // 삼각형 캐노피 (층층이)
  const layers = [
    { y: 26, w: 22, h: 6, color: '#1a2e1a' },
    { y: 18, w: 18, h: 10, color: '#1a3218' },
    { y: 10, w: 14, h: 10, color: '#1a3618' },
    { y: 2, w: 8, h: 10, color: '#1a3a18' },
  ]

  for (const layer of layers) {
    // 삼각형 근사 (점점 좁아지는 사각형)
    ctx.fillStyle = layer.color
    for (let i = 0; i < layer.h; i++) {
      const rowW = layer.w - (i / layer.h) * layer.w
      const x = 16 - rowW / 2
      ctx.fillRect(x, layer.y + i, rowW, 1)
    }
    // 하단 두꺼운 부분
    ctx.fillStyle = '#0a1e0a'
    ctx.fillRect(16 - layer.w / 2, layer.y + layer.h - 2, layer.w, 2)
  }

  // 눈/서리 포인트 (다크 판타지 분위기)
  dither(ctx, 6, 4, 20, 30, '#2a4a2a', 0.05)

  // 그림자
  ctx.fillStyle = rgba('#000000', 0.12)
  ctx.fillRect(10, 44, 12, 3)

  savePng(c, 'obstacle/tree_02.png')
}

const generateRock01 = () => {
  const [c, ctx] = makeCanvas(32, 32)

  // 큰 바위
  ctx.fillStyle = '#3a3a38'
  // 불규칙한 형태 (다각형 근사)
  ctx.fillRect(4, 12, 24, 14)
  ctx.fillRect(6, 8, 20, 4)
  ctx.fillRect(8, 6, 16, 4)
  ctx.fillRect(6, 26, 20, 3)

  // 밝은 면
  ctx.fillStyle = '#4a4a48'
  ctx.fillRect(8, 10, 16, 8)
  ctx.fillStyle = '#555552'
  ctx.fillRect(10, 10, 12, 4)

  // 어두운 면 (하단)
  ctx.fillStyle = '#2a2a28'
  ctx.fillRect(6, 22, 20, 4)
  ctx.fillRect(8, 26, 16, 2)

  // 이끼 패치
  ctx.fillStyle = '#2a3a1a'
  ctx.fillRect(6, 14, 4, 3)
  ctx.fillRect(20, 10, 5, 3)

  // 금 가기
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(14, 8, 1, 10)
  ctx.fillRect(10, 14, 6, 1)

  // 하이라이트
  ctx.fillStyle = '#606060'
  ctx.fillRect(10, 8, 4, 1)
  ctx.fillRect(8, 10, 2, 1)

  // 그림자
  ctx.fillStyle = rgba('#000000', 0.15)
  ctx.fillRect(4, 28, 24, 3)

  savePng(c, 'obstacle/rock_01.png')
}

const generateFountain = () => {
  const [c, ctx] = makeCanvas(48, 48)

  // 수반 (원형 근사)
  ctx.fillStyle = '#4a4a48'
  ctx.fillRect(6, 24, 36, 16)
  ctx.fillRect(4, 26, 40, 12)
  ctx.fillRect(8, 22, 32, 4)
  // 수반 내부
  ctx.fillStyle = '#2a3a5a'
  ctx.fillRect(8, 26, 32, 10)
  ctx.fillStyle = '#3a4a6a'
  ctx.fillRect(10, 28, 28, 6)
  // 수면 반사
  ctx.fillStyle = rgba('#6a8aaa', 0.3)
  ctx.fillRect(12, 29, 8, 2)
  ctx.fillRect(22, 30, 6, 2)

  // 중앙 기둥
  ctx.fillStyle = '#5a5a58'
  ctx.fillRect(20, 12, 8, 16)
  ctx.fillStyle = '#6a6a68'
  ctx.fillRect(21, 14, 6, 12)

  // 물줄기
  ctx.fillStyle = rgba('#6aaacc', 0.5)
  ctx.fillRect(22, 8, 4, 6)
  ctx.fillStyle = rgba('#88ccee', 0.4)
  ctx.fillRect(23, 6, 2, 4)
  // 물방울
  ctx.fillStyle = rgba('#aaddff', 0.3)
  ctx.fillRect(18, 20, 2, 3)
  ctx.fillRect(28, 18, 2, 4)

  // 꼭대기 장식
  ctx.fillStyle = '#6a6a68'
  ctx.fillRect(20, 8, 8, 4)
  ctx.fillStyle = '#7a7a78'
  ctx.fillRect(21, 9, 6, 2)

  // 기단
  ctx.fillStyle = '#3a3a38'
  ctx.fillRect(4, 38, 40, 4)
  ctx.fillStyle = '#4a4a48'
  ctx.fillRect(6, 39, 36, 2)

  // 그림자
  ctx.fillStyle = rgba('#000000', 0.12)
  ctx.fillRect(2, 42, 44, 4)

  savePng(c, 'obstacle/fountain.png')
}

const generateGrass = () => {
  const [c, ctx] = makeCanvas(24, 16)

  // 풀 뭉치 (여러 풀잎)
  const blades = [
    { x: 4, h: 10, color: '#2a4a2a' },
    { x: 7, h: 12, color: '#1a3a1a' },
    { x: 10, h: 14, color: '#2a5a2a' },
    { x: 13, h: 13, color: '#1a4a1a' },
    { x: 16, h: 11, color: '#2a4a2a' },
    { x: 19, h: 9, color: '#1a3a1a' },
  ]

  for (const blade of blades) {
    ctx.fillStyle = blade.color
    ctx.fillRect(blade.x, 16 - blade.h, 2, blade.h)
    // 끝부분 밝게
    ctx.fillStyle = '#3a5a3a'
    ctx.fillRect(blade.x, 16 - blade.h, 1, 2)
  }

  // 기저부
  ctx.fillStyle = '#1a2a1a'
  ctx.fillRect(2, 14, 20, 2)

  savePng(c, 'obstacle/grass.png')
}

// ═══════════════════════════════════════════════
// 6. 투사체
// ═══════════════════════════════════════════════

const generateProjectile = () => {
  const [c, ctx] = makeCanvas(16, 6)

  // 화살/마법탄
  // 꼬리 (깃털)
  ctx.fillStyle = '#aa3333'
  ctx.fillRect(0, 1, 3, 1)
  ctx.fillRect(0, 4, 3, 1)
  ctx.fillStyle = '#883333'
  ctx.fillRect(1, 2, 2, 2)

  // 몸통 (나무)
  ctx.fillStyle = '#5a4a2a'
  ctx.fillRect(3, 2, 8, 2)
  ctx.fillStyle = '#6a5a3a'
  ctx.fillRect(4, 2, 6, 1)

  // 화살촉
  ctx.fillStyle = '#aaaaaa'
  ctx.fillRect(11, 1, 3, 4)
  ctx.fillRect(14, 2, 2, 2)
  ctx.fillStyle = '#cccccc'
  ctx.fillRect(12, 2, 2, 2)

  savePng(c, 'projectile/arrow.png')
}

// ═══════════════════════════════════════════════
// 실행
// ═══════════════════════════════════════════════

console.log('🎨 SoulBlade Dark Fantasy 에셋 생성 시작... (4x 해상도)\n')

console.log('📦 배경 타일 (512×512 @4x):')
generateBackgroundTown()
generateBackgroundSerpentForest()
generateBackgroundIceCave()
generateBackgroundFlameCastle()

console.log('\n⚔️ 플레이어 스프라이트 (640×192 @4x):')
generatePlayerWarrior()
// Mage에 버그 있으므로 수정 버전으로 생성
{
  const [c, ctx] = makeCanvas(160, 48)
  const palette = {
    skin: '#c8a882',
    hair: '#8a8aaa',
    eyeColor: '#8ab8ff',
    torso: '#2a2050',
    torso2: '#3a3068',
    pants: '#1a1840',
    boots: '#2a2040',
    weapon: '#6a4a2a',
    weaponHighlight: '#4a8aff',
    cape: '#2a1850',
  }
  for (let i = 0; i < 5; i++) {
    drawHumanoidFrame(ctx, i, i * 32, 0, palette)
    const ox = i * 32
    // 마법사 모자 (뾰족한 모자)
    ctx.fillStyle = '#2a2050'
    ctx.fillRect(ox + 10, oy(3), 12, 3)
    ctx.fillRect(ox + 12, oy(0), 8, 3)
    ctx.fillRect(ox + 14, oy(-2), 4, 2)
    ctx.fillStyle = '#4a8aff'
    ctx.fillRect(ox + 15, oy(1), 2, 2)
  }
  savePng(c, 'player/mage.png')
  console.log('  ✓ player/mage.png (640×192)')
}
generatePlayerPaladin()
generatePlayerArcher()

console.log('\n👹 몬스터 스프라이트:')
generateMonsterNormal()
generateMonsterElite()
generateMonsterBoss()

console.log('\n🏠 NPC 건물 스프라이트:')
generateNpcShop()
generateNpcBlacksmith()
generateNpcPortalGuide()

console.log('\n🌲 장애물 스프라이트:')
generateTree01()
generateTree02()
generateRock01()
generateFountain()
generateGrass()

console.log('\n🏹 투사체 스프라이트:')
generateProjectile()

console.log('\n✅ 에셋 생성 완료! 총 20개 파일')
