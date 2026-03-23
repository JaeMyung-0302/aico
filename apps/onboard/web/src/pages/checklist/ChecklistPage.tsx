import { useState, useEffect } from 'react'
import api from '@/lib/api'
import styles from './ChecklistPage.module.scss'

interface ChecklistItem {
  id: string
  title: string
  description: string | null
  completed: boolean
}

interface Checklist {
  id: string
  title: string
  items: Array<{ id: string; title: string; description: string | null; _count: { progress: number } }>
}

export const ChecklistPage = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ChecklistItem[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newItems, setNewItems] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChecklists = async (signal?: AbortSignal) => {
    try {
      const { data } = await api.get('/checklists', { signal })
      setChecklists(data)
      setError(null)
    } catch (err) {
      if (signal?.aborted) return
      setError('체크리스트를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const fetchProgress = async (checklistId: string, signal?: AbortSignal) => {
    try {
      const { data } = await api.get(`/checklists/${checklistId}/progress`, { signal })
      setProgress(data)
      setError(null)
    } catch (err) {
      if (signal?.aborted) return
      setError('진행 상황을 불러오는 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchChecklists(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    fetchProgress(selectedId, controller.signal)
    return () => controller.abort()
  }, [selectedId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newItems.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const items = newItems.split('\n').filter(Boolean).map((title) => ({ title: title.trim() }))
      await api.post('/checklists', { title: newTitle, items })
      setNewTitle('')
      setNewItems('')
      await fetchChecklists()
    } catch {
      setError('체크리스트 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (checklistId: string, itemId: string) => {
    try {
      await api.patch(`/checklists/${checklistId}/items/${itemId}/toggle`, {})
      await fetchProgress(checklistId)
    } catch {
      setError('항목 상태 변경에 실패했습니다.')
    }
  }

  const completedCount = progress.filter((p) => p.completed).length

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>온보딩 체크리스트</h1>

      {error && <p style={{ color: 'var(--color-error)', margin: '0.5rem 0' }}>{error}</p>}

      <form onSubmit={handleCreate} className={styles.createForm}>
        <input
          placeholder="체크리스트 제목"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className={styles.input}
        />
        <textarea
          placeholder="항목 (한 줄에 하나씩)"
          value={newItems}
          onChange={(e) => setNewItems(e.target.value)}
          className={styles.textarea}
          rows={3}
        />
        <button type="submit" disabled={isLoading} className={styles.createBtn}>
          {isLoading ? '생성 중...' : '체크리스트 생성'}
        </button>
      </form>

      <div className={styles.grid}>
        <div className={styles.listPanel}>
          {checklists.map((cl) => (
            <button
              key={cl.id}
              onClick={() => setSelectedId(cl.id)}
              className={`${styles.listItem} ${selectedId === cl.id ? styles.active : ''}`}
            >
              <span>{cl.title}</span>
              <span className={styles.count}>{cl.items.length}개 항목</span>
            </button>
          ))}
          {checklists.length === 0 && <p className={styles.empty}>체크리스트가 없습니다.</p>}
        </div>

        {selectedId && progress.length > 0 && (
          <div className={styles.progressPanel}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(completedCount / progress.length) * 100}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {completedCount}/{progress.length} 완료
            </span>

            <div className={styles.items}>
              {progress.map((item) => (
                <label key={item.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggle(selectedId, item.id)}
                  />
                  <span className={item.completed ? styles.completed : ''}>{item.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
