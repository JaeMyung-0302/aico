import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { StatCard } from './components/StatCard'
import { MemberProgress } from './components/MemberProgress'
import styles from './DashboardPage.module.scss'

interface Stats {
  teamSize: number
  documentCount: number
  chatUsage: number
  checklistCount: number
}

interface Member {
  userId: string
  email: string
  name: string | null
  role: string
  completedItems: number
  totalItems: number
  progressPercent: number
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const tenantId = localStorage.getItem('current_tenant_id') || ''

  useEffect(() => {
    if (!tenantId) return

    const fetchData = async () => {
      try {
        const [statsRes, membersRes] = await Promise.all([
          api.get('/dashboard/stats', { headers: { 'x-tenant-id': tenantId } }),
          api.get('/dashboard/members-progress', { headers: { 'x-tenant-id': tenantId } }),
        ])
        setStats(statsRes.data)
        setMembers(membersRes.data)
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [tenantId])

  if (isLoading) return <div>로딩 중...</div>

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>대시보드</h1>

      {stats && (
        <div className={styles.statsGrid}>
          <StatCard label="팀 멤버" value={stats.teamSize} />
          <StatCard label="문서" value={stats.documentCount} />
          <StatCard label="챗봇 사용" value={stats.chatUsage} />
          <StatCard label="체크리스트" value={stats.checklistCount} />
        </div>
      )}

      <h2 className={styles.sectionTitle}>팀원 진행 현황</h2>
      {members.length > 0 ? (
        <MemberProgress members={members} />
      ) : (
        <p className={styles.empty}>팀원이 없습니다.</p>
      )}
    </div>
  )
}
