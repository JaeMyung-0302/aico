import { useState, useCallback, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './GroupSetupPage.module.scss'

const cx = classNames.bind(styles)

type Tab = 'join' | 'create'

export const GroupSetupPage = () => {
  const navigate = useNavigate()
  const {
    joinGroup,
    createGroup,
    checkJoinStatus,
    loading,
    error,
    isAuthenticated,
    needsGroup,
    joinRequestStatus,
    joinRequestGroupName,
    logout,
  } = useAuthStore()
  const [tab, setTab] = useState<Tab>('join')
  const [code, setCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [checking, setChecking] = useState(false)

  // 페이지 진입 시 기존 요청 상태 확인
  useEffect(() => {
    if (isAuthenticated && needsGroup) {
      checkJoinStatus()
    }
  }, [isAuthenticated, needsGroup, checkJoinStatus])

  const handleJoin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!code.trim() || loading) return
      await joinGroup(code.trim())
    },
    [code, loading, joinGroup],
  )

  const handleCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!groupName.trim() || loading) return

      const success = await createGroup(groupName.trim())
      if (success) {
        navigate('/select', { replace: true })
      }
    },
    [groupName, loading, createGroup, navigate],
  )

  const handleRefreshStatus = useCallback(async () => {
    setChecking(true)
    await checkJoinStatus()
    setChecking(false)
  }, [checkJoinStatus])

  const handleReLogin = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const handleRetry = useCallback(() => {
    useAuthStore.setState({
      joinRequestStatus: 'none',
      joinRequestGroupName: null,
      error: null,
    })
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!needsGroup) {
    return <Navigate to="/select" replace />
  }

  // 승인 대기 중 화면
  if (joinRequestStatus === 'pending') {
    return (
      <div className={cx('page')}>
        <span className={cx('logo')}>🧊</span>
        <h1 className={cx('title')}>승인 대기 중</h1>
        <p className={cx('subtitle')}>
          {joinRequestGroupName
            ? `"${joinRequestGroupName}" 그룹 참여 요청이 전송되었습니다`
            : '그룹 참여 요청이 전송되었습니다'}
        </p>

        <div className={cx('statusCard')}>
          <div className={cx('statusIcon')}>⏳</div>
          <p className={cx('statusText')}>
            관리자가 요청을 확인하면 알림을 보내드립니다
          </p>
          <button
            className={cx('refreshBtn')}
            onClick={handleRefreshStatus}
            disabled={checking}
            type="button"
          >
            {checking ? '확인 중...' : '상태 확인'}
          </button>
        </div>

        <button className={cx('backBtn')} onClick={handleRetry} type="button">
          다른 그룹 코드 입력
        </button>
      </div>
    )
  }

  // 승인됨 화면
  if (joinRequestStatus === 'approved') {
    return (
      <div className={cx('page')}>
        <span className={cx('logo')}>🧊</span>
        <h1 className={cx('title')}>참여 승인됨</h1>
        <p className={cx('subtitle')}>
          {joinRequestGroupName
            ? `"${joinRequestGroupName}" 그룹 참여가 승인되었습니다`
            : '그룹 참여가 승인되었습니다'}
        </p>

        <div className={cx('statusCard')}>
          <div className={cx('statusIcon')}>✅</div>
          <p className={cx('statusText')}>다시 로그인하면 그룹에 참여됩니다</p>
          <button
            className={cx('submitBtn')}
            onClick={handleReLogin}
            type="button"
          >
            다시 로그인
          </button>
        </div>
      </div>
    )
  }

  // 거부됨 화면
  if (joinRequestStatus === 'rejected') {
    return (
      <div className={cx('page')}>
        <span className={cx('logo')}>🧊</span>
        <h1 className={cx('title')}>참여 거부됨</h1>
        <p className={cx('subtitle')}>
          {joinRequestGroupName
            ? `"${joinRequestGroupName}" 그룹 참여가 거부되었습니다`
            : '그룹 참여가 거부되었습니다'}
        </p>

        <div className={cx('statusCard')}>
          <div className={cx('statusIcon')}>❌</div>
          <p className={cx('statusText')}>
            다른 그룹에 참여하거나 새 그룹을 만들어보세요
          </p>
          <button
            className={cx('submitBtn')}
            onClick={handleRetry}
            type="button"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cx('page')}>
      <span className={cx('logo')}>🧊</span>
      <h1 className={cx('title')}>그룹 설정</h1>
      <p className={cx('subtitle')}>냉장고를 공유할 그룹을 선택하세요</p>

      <div className={cx('tabs')}>
        <button
          className={cx('tab', { active: tab === 'join' })}
          onClick={() => setTab('join')}
          type="button"
        >
          그룹 참여
        </button>
        <button
          className={cx('tab', { active: tab === 'create' })}
          onClick={() => setTab('create')}
          type="button"
        >
          새 그룹 만들기
        </button>
      </div>

      {tab === 'join' ? (
        <form className={cx('form')} onSubmit={handleJoin}>
          <input
            className={cx('input')}
            type="text"
            placeholder="6자리 코드 입력"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoFocus
          />
          <button
            className={cx('submitBtn')}
            type="submit"
            disabled={!code.trim() || loading}
          >
            {loading ? '요청 중...' : '참여 요청'}
          </button>
        </form>
      ) : (
        <form className={cx('form')} onSubmit={handleCreate}>
          <input
            className={cx('input')}
            type="text"
            placeholder="그룹 이름 (예: 우리집)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={30}
            autoFocus
          />
          <button
            className={cx('submitBtn')}
            type="submit"
            disabled={!groupName.trim() || loading}
          >
            {loading ? '생성 중...' : '만들기'}
          </button>
        </form>
      )}

      {error && <p className={cx('error')}>{error}</p>}
      <p className={cx('hint')}>
        가족/룸메이트와 같은 그룹으로 냉장고를 공유하세요
      </p>
    </div>
  )
}
