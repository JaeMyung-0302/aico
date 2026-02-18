import { useEffect } from 'react'
import { useCodexStore } from '@/stores/useCodexStore'
import { ELEMENT_COLORS } from '@monster-factory/shared'
import type { Element } from '@monster-factory/shared'

export const CodexPage = () => {
  const { entries, discovered, total, completionRate, loading, fetchCodex } = useCodexStore()

  useEffect(() => {
    fetchCodex()
  }, [fetchCodex])

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>도감 ({discovered}/{total}) - {completionRate}%</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        {entries.map((entry) => (
          <div
            key={entry.species.id}
            style={{
              padding: 8,
              borderRadius: 8,
              border: `1px solid ${entry.discovered ? ELEMENT_COLORS[entry.species.element as Element] ?? '#666' : '#333'}`,
              textAlign: 'center',
              opacity: entry.discovered ? 1 : 0.4,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600 }}>
              {entry.discovered ? entry.species.name : '???'}
            </div>
            <div style={{ fontSize: 10, color: '#aaa' }}>
              {entry.species.rarity}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
