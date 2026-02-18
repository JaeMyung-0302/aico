import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useUserStore } from '@/stores/useUserStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import type { Monster } from '@monster-factory/shared'

interface FusionResult {
  success: boolean
  resultSpeciesName: string
  newImageUrl: string | null
  goldSpent: number
}

export const FusionPage = () => {
  const navigate = useNavigate()
  const { fetchUser } = useUserStore()
  const { monsters, fetchMonsters } = useMonsterStore()
  const [parent1, setParent1] = useState<Monster | null>(null)
  const [parent2, setParent2] = useState<Monster | null>(null)
  const [fusing, setFusing] = useState(false)
  const [result, setResult] = useState<FusionResult | null>(null)

  useEffect(() => {
    if (monsters.length === 0) {
      fetchMonsters()
    }
  }, [monsters.length, fetchMonsters])

  const handleFuse = async () => {
    if (!parent1 || !parent2) return
    setFusing(true)
    try {
      const res = await api.post<FusionResult>('/monsters/fuse', {
        parent1Id: parent1.id,
        parent2Id: parent2.id,
      })
      setResult(res)
      await fetchUser()
      await fetchMonsters()
    } catch {
      // 에러 발생
    } finally {
      setFusing(false)
    }
  }

  const available = monsters.filter((m) => m.id !== parent1?.id && m.id !== parent2?.id)

  if (result) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>합성 성공!</h2>
        {result.newImageUrl && (
          <img src={result.newImageUrl} alt="" style={{ width: 160, height: 160, marginTop: 16 }} />
        )}
        <p style={{ marginTop: 12, fontSize: 18 }}>{result.resultSpeciesName}</p>
        <p style={{ color: '#aaa' }}>골드 -{result.goldSpent}</p>
        <button
          onClick={() => navigate('/monsters')}
          style={{ marginTop: 16, padding: '8px 24px' }}
        >
          확인
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate('/monsters')} style={{ marginBottom: 12 }}>← 뒤로</button>
      <h2>합성</h2>

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ flex: 1, padding: 12, border: '1px solid #555', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#aaa' }}>부모 1</div>
          {parent1 ? (
            <div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{parent1.speciesName}</div>
              <button onClick={() => setParent1(null)} style={{ marginTop: 4, fontSize: 12 }}>해제</button>
            </div>
          ) : (
            <div style={{ color: '#666', marginTop: 4 }}>선택 안됨</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24 }}>+</div>
        <div style={{ flex: 1, padding: 12, border: '1px solid #555', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#aaa' }}>부모 2</div>
          {parent2 ? (
            <div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{parent2.speciesName}</div>
              <button onClick={() => setParent2(null)} style={{ marginTop: 4, fontSize: 12 }}>해제</button>
            </div>
          ) : (
            <div style={{ color: '#666', marginTop: 4 }}>선택 안됨</div>
          )}
        </div>
      </div>

      {parent1 && parent2 && (
        <button
          onClick={handleFuse}
          disabled={fusing}
          style={{ marginTop: 16, padding: '10px 24px', width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4 }}
        >
          {fusing ? '합성 중...' : '합성 실행'}
        </button>
      )}

      <h3 style={{ marginTop: 24 }}>몬스터 선택</h3>
      {available.length === 0 ? (
        <p style={{ color: '#aaa' }}>선택 가능한 몬스터가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {available.map((m) => (
            <div
              key={m.id}
              style={{ padding: 8, border: '1px solid #444', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{m.speciesName}</span>
                <span style={{ fontSize: 12, color: '#aaa', marginLeft: 8 }}>{m.element} | {m.rarity}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!parent1 && (
                  <button onClick={() => setParent1(m)} style={{ fontSize: 12, padding: '4px 8px' }}>부모1</button>
                )}
                {!parent2 && (
                  <button onClick={() => setParent2(m)} style={{ fontSize: 12, padding: '4px 8px' }}>부모2</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
