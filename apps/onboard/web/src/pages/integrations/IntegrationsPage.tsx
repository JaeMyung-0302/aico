import { useState, useEffect } from 'react'
import api from '@/lib/api'
import styles from './IntegrationsPage.module.scss'

interface Integration {
  id: string
  type: 'notion' | 'github'
  createdAt: string
}

export const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [type, setType] = useState<'notion' | 'github'>('notion')
  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const tenantId = localStorage.getItem('current_tenant_id') || ''

  const fetchIntegrations = async () => {
    try {
      const { data } = await api.get('/integrations', {
        headers: { 'x-tenant-id': tenantId },
      })
      setIntegrations(data)
    } catch {
      setError('연동 목록을 불러올 수 없습니다.')
    }
  }

  useEffect(() => {
    if (tenantId) {
      fetchIntegrations()
    }
  }, [tenantId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const config = type === 'github' ? { owner, repo } : {}
      await api.post(
        '/integrations',
        { type, accessToken: token, config },
        { headers: { 'x-tenant-id': tenantId } },
      )
      setToken('')
      setOwner('')
      setRepo('')
      await fetchIntegrations()
    } catch {
      setError('연동 추가에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/integrations/${id}`, {
        headers: { 'x-tenant-id': tenantId },
      })
      await fetchIntegrations()
    } catch {
      setError('연동 삭제에 실패했습니다.')
    }
  }

  const handleSync = async (integrationId: string) => {
    try {
      await api.post(
        '/knowledge-base/sync',
        { integrationId },
        { headers: { 'x-tenant-id': tenantId } },
      )
      alert('동기화 작업이 시작되었습니다.')
    } catch {
      setError('동기화 요청에 실패했습니다.')
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>연동 관리</h1>

      <form onSubmit={handleAdd} className={styles.form}>
        <select value={type} onChange={(e) => setType(e.target.value as 'notion' | 'github')}>
          <option value="notion">Notion</option>
          <option value="github">GitHub</option>
        </select>

        <input
          type="password"
          placeholder="Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />

        {type === 'github' && (
          <>
            <input placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} required />
            <input placeholder="Repository" value={repo} onChange={(e) => setRepo(e.target.value)} required />
          </>
        )}

        <button type="submit" disabled={isLoading}>
          {isLoading ? '추가 중...' : '연동 추가'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.list}>
        {integrations.map((integration) => (
          <div key={integration.id} className={styles.card}>
            <div className={styles.cardInfo}>
              <span className={styles.type}>{integration.type}</span>
              <span className={styles.date}>
                {new Date(integration.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className={styles.cardActions}>
              <button onClick={() => handleSync(integration.id)}>동기화</button>
              <button onClick={() => handleDelete(integration.id)} className={styles.deleteBtn}>
                삭제
              </button>
            </div>
          </div>
        ))}
        {integrations.length === 0 && (
          <p className={styles.empty}>연동된 서비스가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
