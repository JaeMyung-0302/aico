import { useEffect, useState } from 'react'
import { usePartyStore } from '@/stores/usePartyStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { ELEMENT_COLORS } from '@monster-factory/shared'
import type { Element, Monster } from '@monster-factory/shared'

export const PartyPage = () => {
  const { party, loading, fetchParty, updateParty } = usePartyStore()
  const { monsters, fetchMonsters } = useMonsterStore()
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchParty()
    fetchMonsters()
  }, [fetchParty, fetchMonsters])

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>

  const slots = [
    { id: party?.slot1Id ?? null, monster: party?.slot1 as Monster | null },
    { id: party?.slot2Id ?? null, monster: party?.slot2 as Monster | null },
    { id: party?.slot3Id ?? null, monster: party?.slot3 as Monster | null },
  ]

  const handleSelect = async (monsterId: string | null) => {
    if (editingSlot === null) return
    setSaving(true)
    try {
      const newSlots = [...slots.map((s) => s.id)]
      newSlots[editingSlot] = monsterId
      await updateParty(newSlots[0] ?? null, newSlots[1] ?? null, newSlots[2] ?? null)
      await fetchParty()
    } catch {
      // 에러 무시
    } finally {
      setSaving(false)
      setEditingSlot(null)
    }
  }

  const partyMemberIds = new Set(slots.map((s) => s.id).filter(Boolean))
  const availableMonsters = monsters.filter((m) => !partyMemberIds.has(m.id))

  return (
    <div style={{ padding: 20 }}>
      <h2>파티 편성</h2>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {slots.map((slot, idx) => (
          <div
            key={idx}
            onClick={() => setEditingSlot(idx)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: `2px solid ${slot.monster ? ELEMENT_COLORS[slot.monster.element as Element] ?? '#666' : '#333'}`,
              textAlign: 'center',
              cursor: 'pointer',
              minHeight: 100,
            }}
          >
            <div style={{ fontSize: 10, color: '#aaa' }}>슬롯 {idx + 1}</div>
            {slot.monster ? (
              <>
                {slot.monster.imageUrl ? (
                  <img src={slot.monster.imageUrl} alt="" style={{ width: 48, height: 48 }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: '#333', margin: '4px auto', borderRadius: 8 }} />
                )}
                <div style={{ fontSize: 11 }}>{slot.monster.speciesName ?? slot.monster.element}</div>
              </>
            ) : (
              <div style={{ marginTop: 16, fontSize: 24, color: '#555' }}>+</div>
            )}
          </div>
        ))}
      </div>

      {editingSlot !== null && (
        <div style={{ marginTop: 16 }}>
          <h3>슬롯 {editingSlot + 1} 몬스터 선택</h3>
          <button onClick={() => handleSelect(null)} disabled={saving} style={{ marginBottom: 8 }}>
            비우기
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {availableMonsters.map((m) => (
              <div
                key={m.id}
                onClick={() => !saving && handleSelect(m.id)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border: `1px solid ${ELEMENT_COLORS[m.element as Element] ?? '#666'}`,
                  textAlign: 'center',
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: 11 }}>{m.speciesName ?? m.element}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>{m.rarity}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
