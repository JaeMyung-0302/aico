import { useState, useEffect } from 'react'
import api from '@/lib/api'
import styles from './KnowledgeBasePage.module.scss'

interface Document {
  id: string
  title: string
  chunkCount: number
  lastSyncedAt: string
  sourceUrl: string | null
}

interface SyncStatus {
  documentCount: number
  chunkCount: number
}

export const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const tenantId = localStorage.getItem('current_tenant_id') || ''

  useEffect(() => {
    if (!tenantId) return

    const fetchData = async () => {
      try {
        const [docsRes, statusRes] = await Promise.all([
          api.get('/knowledge-base/documents', { headers: { 'x-tenant-id': tenantId } }),
          api.get('/knowledge-base/status', { headers: { 'x-tenant-id': tenantId } }),
        ])
        setDocuments(docsRes.data)
        setStatus(statusRes.data)
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [tenantId])

  if (isLoading) {
    return <div>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>지식 베이스</h1>

      {status && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{status.documentCount}</span>
            <span className={styles.statLabel}>문서</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{status.chunkCount}</span>
            <span className={styles.statLabel}>청크</span>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {documents.map((doc) => (
          <div key={doc.id} className={styles.card}>
            <div>
              <h3 className={styles.docTitle}>{doc.title}</h3>
              <span className={styles.meta}>
                {doc.chunkCount}개 청크 | {new Date(doc.lastSyncedAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {doc.sourceUrl && (
              <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                원본
              </a>
            )}
          </div>
        ))}
        {documents.length === 0 && (
          <p className={styles.empty}>아직 동기화된 문서가 없습니다. 연동 관리에서 동기화를 시작하세요.</p>
        )}
      </div>
    </div>
  )
}
