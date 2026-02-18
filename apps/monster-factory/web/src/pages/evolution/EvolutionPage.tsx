import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useUserStore } from '@/stores/useUserStore'
import { useMonsterStore } from '@/stores/useMonsterStore'

interface EvolutionPath {
  id: string
  toSpeciesId: string
  toSpeciesName: string
  toRarity: string
  toElement: string
  goldCost: number
  minGrowthStage: string
}

interface EvolutionResult {
  success: boolean
  toSpeciesName: string
  newImageUrl: string | null
  goldSpent: number
}

export const EvolutionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchUser } = useUserStore()
  const { fetchMonsters } = useMonsterStore()
  const [paths, setPaths] = useState<EvolutionPath[]>([])
  const [loading, setLoading] = useState(true)
  const [evolving, setEvolving] = useState(false)
  const [result, setResult] = useState<EvolutionResult | null>(null)

  useEffect(() => {
    if (!id) return
    api.get<EvolutionPath[]>(`/monsters/${id}/evolution-paths`)
      .then(setPaths)
      .catch(() => navigate('/monsters'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleEvolve = async (pathId: string) => {
    if (!id) return
    setEvolving(true)
    try {
      const res = await api.post<EvolutionResult>(`/monsters/${id}/evolve`, { evolutionPathId: pathId })
      setResult(res)
      await fetchUser()
      await fetchMonsters()
    } catch {
      // 에러 발생
    } finally {
      setEvolving(false)
    }
  }

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>

  if (result) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>진화 성공!</h2>
        {result.newImageUrl && (
          <img src={result.newImageUrl} alt="" style={{ width: 160, height: 160, marginTop: 16 }} />
        )}
        <p style={{ marginTop: 12, fontSize: 18 }}>{result.toSpeciesName}</p>
        <p style={{ color: '#aaa' }}>골드 -{result.goldSpent}</p>
        <button
          onClick={() => navigate(`/monsters/${id}`)}
          style={{ marginTop: 16, padding: '8px 24px' }}
        >
          확인
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(`/monsters/${id}`)} style={{ marginBottom: 12 }}>← 뒤로</button>
      <h2>진화</h2>
      {paths.length === 0 ? (
        <p style={{ color: '#aaa', marginTop: 16 }}>가능한 진화 경로가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {paths.map((path) => (
            <div
              key={path.id}
              style={{ padding: 12, border: '1px solid #555', borderRadius: 8 }}
            >
              <div style={{ fontWeight: 600 }}>{path.toSpeciesName}</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>
                {path.toRarity} | {path.toElement} | 최소 {path.minGrowthStage}
              </div>
              <button
                onClick={() => handleEvolve(path.id)}
                disabled={evolving}
                style={{ marginTop: 8, padding: '6px 16px' }}
              >
                진화 ({path.goldCost} Gold)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
