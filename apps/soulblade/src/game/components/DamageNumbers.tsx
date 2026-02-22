/**
 * 데미지 넘버 렌더링
 * eventBus 'combat:damageNumber' 이벤트를 수신하여
 * 떠오르는 데미지 텍스트 표시 (HTML Overlay 방식)
 *
 * R3F Canvas 내부 컴포넌트: Html (drei) 사용
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { eventBus } from '@/lib/event-bus'

interface DamageEntry {
  id: number
  x: number
  y: number // game Y (Y-down)
  damage: number
  isCrit: boolean
  color: string
  age: number // ms
}

const MAX_ENTRIES = 20
const LIFETIME_MS = 800
const FLOAT_SPEED = 40 // px/sec (game coords)

let entryIdCounter = 0

export const DamageNumbers = () => {
  const entriesRef = useRef<DamageEntry[]>([])
  const [, forceUpdate] = useState(0)

  const handleDamageNumber = useCallback((data: {
    x: number
    y: number
    damage: number
    isCrit: boolean
    color?: string
  }) => {
    entryIdCounter += 1
    const entry: DamageEntry = {
      id: entryIdCounter,
      x: data.x,
      y: data.y,
      damage: data.damage,
      isCrit: data.isCrit,
      color: data.color ?? (data.isCrit ? '#ffff00' : '#ffffff'),
      age: 0,
    }

    const entries = entriesRef.current
    if (entries.length >= MAX_ENTRIES) {
      entries.shift()
    }
    entries.push(entry)
  }, [])

  useEffect(() => {
    eventBus.on('combat:damageNumber', handleDamageNumber)
    return () => {
      eventBus.off('combat:damageNumber', handleDamageNumber)
    }
  }, [handleDamageNumber])

  // 매 프레임: age 증가 + 만료 항목 제거
  useFrame((_state, delta) => {
    const entries = entriesRef.current
    if (entries.length === 0) return

    const deltaMs = delta * 1000

    for (const entry of entries) {
      entry.age += deltaMs
      entry.y -= FLOAT_SPEED * delta // 위로 떠오름 (game Y-down이므로 빼기)
    }

    // 만료 항목 제거 (in-place splice — GC 회피)
    let writeIdx = 0
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!
      if (entry.age < LIFETIME_MS) {
        entries[writeIdx] = entry
        writeIdx++
      }
    }
    entries.length = writeIdx

    // 매 프레임 rerender (위치 애니메이션 반영)
    forceUpdate((n) => n + 1)
  })

  const entries = entriesRef.current

  return (
    <>
      {entries.map((entry) => {
        const opacity = 1 - entry.age / LIFETIME_MS
        const scale = entry.isCrit ? 1.5 : 1.0
        const fontSize = entry.isCrit ? 14 : 10

        return (
          <mesh
            key={entry.id}
            position={[entry.x, -entry.y, 10]}
            scale={[scale, scale, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              transparent
              opacity={opacity * 0.01} // 거의 보이지 않는 placeholder
              color={entry.color}
            />
          </mesh>
        )
      })}
    </>
  )
}
