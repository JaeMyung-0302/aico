import { useState, useEffect, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './MembersPage.module.scss'

interface MemberUser {
  id: string
  email: string
  name: string | null
}

interface TenantMember {
  id: string
  role: string
  joinedAt: string
  user: MemberUser
}

interface TenantDetail {
  id: string
  name: string
  members: TenantMember[]
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '멤버',
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const MembersPage = () => {
  const [members, setMembers] = useState<TenantMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const tenantId = useAuthStore((s) => s.tenant?.id) || ''

  const fetchMembers = async (signal?: AbortSignal) => {
    if (!tenantId) return

    try {
      const { data } = await api.get<TenantDetail>(`/tenants/${tenantId}`, { signal })
      setMembers(data.members)
    } catch (err) {
      if (signal?.aborted) return
      setFeedback({ type: 'error', message: '팀원 목록을 불러올 수 없습니다.' })
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchMembers(controller.signal)
    return () => controller.abort()
  }, [tenantId])

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setIsInviting(true)
    setFeedback(null)

    try {
      await api.post(`/tenants/${tenantId}/members`, { email: trimmedEmail })
      setEmail('')
      setFeedback({ type: 'success', message: `${trimmedEmail} 님을 초대했습니다.` })
      await fetchMembers()
    } catch (error) {
      if (isAxiosError(error)) {
        const message = error.response?.data?.message || '초대에 실패했습니다.'
        setFeedback({ type: 'error', message })
      } else {
        setFeedback({ type: 'error', message: '초대에 실패했습니다.' })
      }
    } finally {
      setIsInviting(false)
    }
  }

  if (isLoading) return <div>로딩 중...</div>

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>팀원 관리</h1>

      <section className={styles.inviteSection}>
        <h2 className={styles.sectionTitle}>팀원 초대</h2>
        <form className={styles.inviteForm} onSubmit={handleInvite}>
          <input
            type="email"
            className={styles.emailInput}
            placeholder="초대할 이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isInviting}
            required
          />
          <button type="submit" className={styles.inviteButton} disabled={isInviting}>
            {isInviting ? '초대 중...' : '초대'}
          </button>
        </form>
        {feedback && (
          <p className={feedback.type === 'success' ? styles.success : styles.error}>
            {feedback.message}
          </p>
        )}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>팀원 목록 ({members.length}명)</h2>
        {members.length === 0 ? (
          <p className={styles.empty}>팀원이 없습니다.</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>이름</span>
              <span>이메일</span>
              <span>역할</span>
              <span>가입일</span>
            </div>
            {members.map((member) => (
              <div key={member.id} className={styles.tableRow}>
                <span>{member.user.name || '-'}</span>
                <span className={styles.email}>{member.user.email}</span>
                <span className={styles.role}>{ROLE_LABELS[member.role] || member.role}</span>
                <span className={styles.date}>{formatDate(member.joinedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
