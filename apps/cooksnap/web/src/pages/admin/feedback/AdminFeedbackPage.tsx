import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import api from '@/lib/api'
import { Loading } from '@repo/ui'
import { FeedbackCategory, FeedbackStatus } from '@/types/feedback'
import type { FeedbackListResponse } from '@/types/feedback'
import styles from './AdminFeedbackPage.module.scss'

const cx = classnames.bind(styles)

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  [FeedbackCategory.BUG]: '버그',
  [FeedbackCategory.FEATURE_REQUEST]: '기능 요청',
  [FeedbackCategory.IMPROVEMENT]: '개선',
  [FeedbackCategory.OTHER]: '기타',
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  [FeedbackStatus.PENDING]: '대기',
  [FeedbackStatus.REVIEWING]: '검토 중',
  [FeedbackStatus.APPLIED]: '반영됨',
  [FeedbackStatus.REJECTED]: '반려',
}

const AdminFeedbackPage = () => {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isFetching, error } = useQuery<FeedbackListResponse>({
    queryKey: ['admin-feedback', categoryFilter, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit }
      if (categoryFilter) params.category = categoryFilter
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/feedback/admin', { params })
      return data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      await api.patch(`/feedback/admin/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] })
    },
  })

  const handleStatusChange = (id: string, status: FeedbackStatus) => {
    statusMutation.mutate({ id, status })
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  if (error) {
    const statusCode = (error as { response?: { status?: number } })?.response?.status
    if (statusCode === 403) {
      return (
        <div className={cx('container')}>
          <div className={cx('errorMessage')}>관리자 권한이 필요합니다.</div>
        </div>
      )
    }
    return (
      <div className={cx('container')}>
        <div className={cx('errorMessage')}>데이터를 불러오는데 실패했습니다.</div>
      </div>
    )
  }

  return (
    <div className={cx('container')}>
      <Helmet>
        <title>피드백 관리 - CookSnap</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className={cx('pageTitle')}>피드백 관리</h1>

      <div className={cx('filters')}>
        <select
          className={cx('filterSelect')}
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
        >
          <option value="">전체 카테고리</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          className={cx('filterSelect')}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {data && (
          <span className={cx('totalCount')}>총 {data.total}건</span>
        )}
      </div>

      {isFetching && (!data || data.data.length === 0) ? (
        <Loading message="피드백을 불러오는 중..." />
      ) : !data || data.data.length === 0 ? (
        <div className={cx('empty')}>피드백이 없습니다.</div>
      ) : (
        <>
          <div className={cx('feedbackList')}>
            {data.data.map((feedback) => (
              <div key={feedback.id} className={cx('feedbackCard')}>
                <div className={cx('cardHeader')}>
                  <span className={cx('categoryBadge', feedback.category.toLowerCase())}>
                    {CATEGORY_LABELS[feedback.category]}
                  </span>
                  <span className={cx('date')}>
                    {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                <p className={cx('content')}>{feedback.content}</p>

                <div className={cx('cardFooter')}>
                  <span className={cx('author')}>
                    {feedback.user?.nickname || feedback.user?.email || '알 수 없음'}
                  </span>
                  <select
                    className={cx('statusSelect', feedback.status.toLowerCase())}
                    value={feedback.status}
                    onChange={(e) => handleStatusChange(feedback.id, e.target.value as FeedbackStatus)}
                    disabled={statusMutation.isPending}
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={cx('pagination')}>
              <button
                className={cx('pageButton')}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </button>
              <span className={cx('pageInfo')}>{page} / {totalPages}</span>
              <button
                className={cx('pageButton')}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminFeedbackPage
