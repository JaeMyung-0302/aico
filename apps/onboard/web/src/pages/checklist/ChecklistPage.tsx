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

  const tenantId = localStorage.getItem('current_tenant_id') || ''

  const fetchChecklists = async () => {
    try {
      const { data } = await api.get('/checklists', {
        headers: { 'x-tenant-id': tenantId },
      })
      setChecklists(data)
    } catch {
      // silently fail
    }
  }

  const fetchProgress = async (checklistId: string) => {
    try {
      const { data } = await api.get(`/checklists/${checklistId}/progress`, {
        headers: { 'x-tenant-id': tenantId },
      })
      setProgress(data)
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    if (tenantId) fetchChecklists()
  }, [tenantId])

  useEffect(() => {
    if (selectedId) fetchProgress(selectedId)
  }, [selectedId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newItems.trim()) return
    setIsLoading(true)

    try {
      const items = newItems.split('\n').filter(Boolean).map((title) => ({ title: title.trim() }))
      await api.post('/checklists', { title: newTitle, items }, {
        headers: { 'x-tenant-id': tenantId },
      })
      setNewTitle('')
      setNewItems('')
      await fetchChecklists()
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (checklistId: string, itemId: string) => {
    try {
      await api.patch(`/checklists/${checklistId}/items/${itemId}/toggle`, {}, {
        headers: { 'x-tenant-id': tenantId },
      })
      await fetchProgress(checklistId)
    } catch {
      // silently fail
    }
  }

  const completedCount = progress.filter((p) => p.completed).length

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>온보딩 체크리스트</h1>

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
