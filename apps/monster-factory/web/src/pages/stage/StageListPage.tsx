import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStageStore } from '@/stores/useStageStore'

export const StageListPage = () => {
  const navigate = useNavigate()
  const { chapters, loading, fetchStages } = useStageStore()
  const [activeChapter, setActiveChapter] = useState(0)

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>

  const chapter = chapters[activeChapter]

  return (
    <div style={{ padding: 20 }}>
      <h2>모험</h2>

      {/* 챕터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {chapters.map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => setActiveChapter(idx)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              background: activeChapter === idx ? '#6366f1' : '#333',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Ch.{ch.number}
          </button>
        ))}
      </div>

      {chapter && (
        <>
          <h3 style={{ marginTop: 12 }}>{chapter.name}</h3>
          <p style={{ fontSize: 12, color: '#aaa' }}>
            {chapter.description} ({chapter.clearedCount}/{chapter.totalCount})
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 12 }}>
            {chapter.stages.map((stage) => {
              const cleared = stage.result !== null
              const stars = stage.result?.stars ?? 0

              return (
                <button
                  key={stage.id}
                  onClick={() => navigate(`/stages/${stage.id}/battle`)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${stage.isBoss ? '#f59e0b' : cleared ? '#22c55e' : '#555'}`,
                    background: stage.isBoss ? '#451a03' : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {stage.isBoss ? 'BOSS' : stage.stageNumber}
                  </div>
                  {cleared && (
                    <div style={{ fontSize: 10, color: '#f59e0b' }}>
                      {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: '#aaa' }}>⚡{stage.energyCost}</div>
                </button>
              )
            })}
          </div>
        </>
      )}

      <button
        onClick={() => navigate('/party')}
        style={{ marginTop: 16, padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4 }}
      >
        파티 편성
      </button>
    </div>
  )
}
