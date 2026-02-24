import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loading } from '@repo/ui'
import useRedirectUrl from '@/hooks/useRedirectUrl'
import PremiumModal from '@/components/PremiumModal'
import type { SavedRecipe, AnalysisHistoryItem, SubscriptionInfo } from '@/types/user'
import styles from './MyPage.module.scss'

const cx = classnames.bind(styles)

type Tab = 'saved' | 'history'

const MyPage = () => {
  const { isAuthenticated, isLoading: authLoading } = useRedirectUrl()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, initialize } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('saved')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const { data: savedRecipes = [], isFetching: isSavedFetching } = useQuery<SavedRecipe[]>({
    queryKey: ['my-recipes'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/recipes')
      return data
    },
  })

  const { data: history = [], isFetching: isHistoryFetching } = useQuery<AnalysisHistoryItem[]>({
    queryKey: ['my-history'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/history')
      return data
    },
  })

  const { data: subscription } = useQuery<SubscriptionInfo>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const { data } = await api.get('/payments/status')
      return data
    },
    enabled: !!user?.isPremium,
  })

  const handleRecipeClick = (recipeId: string) => {
    navigate(`/result/${recipeId}`)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('정말 구독을 해지하시겠습니까?\n현재 결제 기간이 끝날 때까지 프리미엄을 이용할 수 있습니다.')) return

    setIsCancelling(true)
    try {
      await api.post('/payments/cancel')
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
      await initialize()
    } catch {
      alert('구독 해지에 실패했습니다.')
    } finally {
      setIsCancelling(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (authLoading || !isAuthenticated) {
    return <Loading fullPage />
  }

  return (
    <div className={cx('mypage')}>
      <Helmet>
        <title>마이페이지 - CookSnap</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className={cx('profileCard')}>
        <div className={cx('profileAvatar')}>
          {user?.nickname?.[0] || user?.email[0] || '?'}
        </div>
        <div className={cx('profileInfo')}>
          <div className={cx('profileNameRow')}>
            <span className={cx('profileName')}>
              {user?.nickname || user?.email.split('@')[0]}
            </span>
            {user?.isPremium && (
              <span className={cx('premiumBadge')}>Premium</span>
            )}
          </div>
          <p className={cx('profileEmail')}>{user?.email}</p>
          {user?.isAdmin && (
            <Link to="/admin/feedback" className={cx('adminLink')}>
              피드백 관리
            </Link>
          )}
          {user?.isPremium && subscription?.hasSubscription && (
            <div className={cx('subscriptionInfo')}>
              {subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && (
                <>
                  <span className={cx('subscriptionText')}>
                    다음 갱신일: {formatDate(subscription.currentPeriodEnd)}
                  </span>
                  <button
                    className={cx('cancelButton')}
                    onClick={handleCancelSubscription}
                    disabled={isCancelling}
                  >
                    {isCancelling ? '처리 중...' : '구독 해지'}
                  </button>
                </>
              )}
              {subscription.status === 'CANCELLED' && subscription.currentPeriodEnd && (
                <span className={cx('subscriptionText', 'cancelled')}>
                  {formatDate(subscription.currentPeriodEnd)}까지 프리미엄 유지
                </span>
              )}
            </div>
          )}
        </div>
        {!user?.isPremium && (
          <button
            className={cx('upgradeButton')}
            onClick={() => setShowPremiumModal(true)}
          >
            Premium 구독하기
          </button>
        )}
      </div>

      <div className={cx('tabs')}>
        <button
          className={cx('tab', { active: activeTab === 'saved' })}
          onClick={() => setActiveTab('saved')}
        >
          저장된 레시피
        </button>
        <button
          className={cx('tab', { active: activeTab === 'history' })}
          onClick={() => setActiveTab('history')}
        >
          분석 히스토리
        </button>
      </div>

      {activeTab === 'saved' && (
        <div className={cx('grid')}>
          {isSavedFetching && savedRecipes.length === 0 ? (
            <Loading message="저장된 레시피를 불러오는 중..." />
          ) : savedRecipes.length === 0 ? (
            <div className={cx('empty')}>저장된 레시피가 없습니다.</div>
          ) : (
            savedRecipes.map((item) => (
              <div
                key={item.id}
                className={cx('recipeCard')}
                onClick={() => handleRecipeClick(item.recipeId)}
              >
                {item.recipe.thumbnailUrl && (
                  <img
                    className={cx('cardThumbnail')}
                    src={item.recipe.thumbnailUrl}
                    alt={item.recipe.title}
                  />
                )}
                <div className={cx('cardBody')}>
                  <p className={cx('cardTitle')}>{item.recipe.title}</p>
                  {item.recipe.totalPrice && (
                    <p className={cx('cardPrice')}>
                      {item.recipe.totalPrice.toLocaleString()}원
                    </p>
                  )}
                  <p className={cx('cardDate')}>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className={cx('historyList')}>
          {isHistoryFetching && history.length === 0 ? (
            <Loading message="분석 히스토리를 불러오는 중..." />
          ) : history.length === 0 ? (
            <div className={cx('empty')}>분석 히스토리가 없습니다.</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={cx('historyItem')}
              >
                <div className={cx('historyInfo')}>
                  <p className={cx('historyTitle')}>{item.recipe.title}</p>
                  {user?.isPremium && (
                    <p className={cx('historyUrl')}>{item.videoUrl}</p>
                  )}
                </div>
                <span className={cx('historyDate')}>
                  {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  )
}

export default MyPage
