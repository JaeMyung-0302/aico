/**
 * HP 바 오버레이
 * 활성 몬스터/엘리트의 HP 바를 Three.js Graphics로 렌더링
 *
 * InstancedMesh와 별도로 렌더링 (HP 바는 Line/Plane 기반)
 * LOD에 따라 비표시 가능
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, BufferAttribute } from 'three'
import type { LineSegments } from 'three'
import { useEntityStore } from '../stores/useEntityStore'

const MAX_BARS = 80
const BAR_WIDTH = 24
const BAR_Y_OFFSET = 20 // 몬스터 위에 표시 (Three.js Y-up: +Y = 화면 위)
// 빌보딩 후 몬스터 스프라이트 상단 Z ≈ 18, HP 바는 그 위에
const HP_BAR_Z_BG = 20
const HP_BAR_Z_FG = 21

export const HpBarOverlay = () => {
  const bgRef = useRef<LineSegments>(null)
  const fgRef = useRef<LineSegments>(null)

  // 배경 바 (어두운 빨강) + 전경 바 (밝은 초록) 각각의 geometry
  const bgPositions = useMemo(() => new Float32Array(MAX_BARS * 6), []) // 2 vertices × 3 per bar
  const fgPositions = useMemo(() => new Float32Array(MAX_BARS * 6), [])

  const bgGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(bgPositions, 3))
    return geo
  }, [bgPositions])

  const fgGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(fgPositions, 3))
    return geo
  }, [fgPositions])

  useFrame(() => {
    const monsters = useEntityStore.getState().monsters
    const elites = useEntityStore.getState().elites
    let idx = 0

    // 몬스터 HP 바
    for (const m of monsters) {
      if (!m.active || idx >= MAX_BARS) continue
      if (m.hp >= m.maxHp) continue // 풀 HP이면 비표시

      const baseX = m.body.x - BAR_WIDTH / 2
      const baseY = -m.body.y + BAR_Y_OFFSET
      const hpRatio = m.hp / m.maxHp

      // 배경 바 (전체)
      const bi = idx * 6
      bgPositions[bi] = baseX
      bgPositions[bi + 1] = baseY
      bgPositions[bi + 2] = HP_BAR_Z_BG
      bgPositions[bi + 3] = baseX + BAR_WIDTH
      bgPositions[bi + 4] = baseY
      bgPositions[bi + 5] = HP_BAR_Z_BG

      // 전경 바 (HP 비율)
      fgPositions[bi] = baseX
      fgPositions[bi + 1] = baseY
      fgPositions[bi + 2] = HP_BAR_Z_FG
      fgPositions[bi + 3] = baseX + BAR_WIDTH * hpRatio
      fgPositions[bi + 4] = baseY
      fgPositions[bi + 5] = HP_BAR_Z_FG

      idx++
    }

    // 엘리트 HP 바
    for (const e of elites) {
      if (!e.active || idx >= MAX_BARS) continue
      if (e.hp >= e.maxHp) continue

      const eliteBarWidth = 32
      const baseX = e.body.x - eliteBarWidth / 2
      const baseY = -e.body.y + BAR_Y_OFFSET - 4 // 엘리트는 좀 더 위에
      const hpRatio = e.hp / e.maxHp

      const bi = idx * 6
      bgPositions[bi] = baseX
      bgPositions[bi + 1] = baseY
      bgPositions[bi + 2] = 1
      bgPositions[bi + 3] = baseX + eliteBarWidth
      bgPositions[bi + 4] = baseY
      bgPositions[bi + 5] = HP_BAR_Z_BG

      fgPositions[bi] = baseX
      fgPositions[bi + 1] = baseY
      fgPositions[bi + 2] = 2
      fgPositions[bi + 3] = baseX + eliteBarWidth * hpRatio
      fgPositions[bi + 4] = baseY
      fgPositions[bi + 5] = HP_BAR_Z_FG

      idx++
    }

    // 남은 슬롯 숨기기
    for (let i = idx; i < MAX_BARS; i++) {
      const bi = i * 6
      bgPositions[bi] = 0
      bgPositions[bi + 1] = 0
      bgPositions[bi + 2] = -9999
      bgPositions[bi + 3] = 0
      bgPositions[bi + 4] = 0
      bgPositions[bi + 5] = -9999
      fgPositions[bi] = 0
      fgPositions[bi + 1] = 0
      fgPositions[bi + 2] = -9999
      fgPositions[bi + 3] = 0
      fgPositions[bi + 4] = 0
      fgPositions[bi + 5] = -9999
    }

    // geometry 갱신
    bgGeometry.attributes.position!.needsUpdate = true
    bgGeometry.setDrawRange(0, idx * 2)
    fgGeometry.attributes.position!.needsUpdate = true
    fgGeometry.setDrawRange(0, idx * 2)
  })

  return (
    <>
      <lineSegments ref={bgRef} geometry={bgGeometry}>
        <lineBasicMaterial color="#661111" linewidth={3} />
      </lineSegments>
      <lineSegments ref={fgRef} geometry={fgGeometry}>
        <lineBasicMaterial color="#44ff44" linewidth={3} />
      </lineSegments>
    </>
  )
}
