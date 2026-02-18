import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { StatBar } from '@/components/StatBar'
import type { Monster } from '@monster-factory/shared'

export const MonsterDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [monster, setMonster] = useState<Monster | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get<Monster>(`/monsters/${id}`)
      .then(setMonster)
      .catch(() => navigate('/monsters'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading || !monster) return <div style={{ padding: 20 }}>로딩 중...</div>

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate('/monsters')} style={{ marginBottom: 12 }}>← 목록</button>
      <div style={{ textAlign: 'center' }}>
        {monster.imageUrl ? (
          <img src={monster.imageUrl} alt={monster.element} style={{ width: 160, height: 160 }} />
        ) : (
          <div style={{ width: 160, height: 160, background: '#333', margin: '0 auto', borderRadius: 12 }} />
        )}
        <h2>{monster.speciesName ?? `${monster.element} ${monster.personality}`}</h2>
        <p>{monster.rarity} | {monster.growthStage}</p>
      </div>
      <div style={{ marginTop: 16 }}>
        <StatBar stats={monster.stats} />
      </div>
    </div>
  )
}
