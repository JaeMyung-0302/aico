import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { api } from '@/lib/api'
import { FRIDGE_TYPE_LABELS } from '@/types'
import type { JoinRequestResponse, SubscriptionStatusResponse } from '@/types'
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { PremiumModal } from '@/components/PremiumModal/PremiumModal'
import styles from './SettingsPage.module.scss'

const cx = classNames.bind(styles)

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { user, groupName, groupCode, isAdmin, fetchMe, logout } = useAuthStore()
  const { fridges, fetchFridges, updateFridge, deleteFridge } = useFridgeStore()
  const [editingFridgeId, setEditingFridgeId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingFridgeId, setDeletingFridgeId] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequestResponse[]>([])
  const [requestLoading, setRequestLoading] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [confirmCancelSub, setConfirmCancelSub] = useState(false)

  useEffect(() => {
    fetchFridges()
  }, [fetchFridges])

  // 사용자 정보 + 관리자 여부 조회
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // 관리자일 때만 대기 중인 참여 요청 조회
  useEffect(() => {
    if (!isAdmin) return
    const fetchJoinRequests = async () => {
      try {
        const data = await api.get<JoinRequestResponse[]>('/join-requests/pending')
        setJoinRequests(data)
      } catch {
        // 참여 요청 조회 실패 시 무시
      }
    }
    fetchJoinRequests()
  }, [isAdmin])

  useEffect(() => {
    if (!isPushSupported()) return
    isPushSubscribed()
      .then(setPushEnabled)
      .catch(() => setPushEnabled(false))
  }, [])

  useEffect(() => {
    if (!pushError) return
    const timer = setTimeout(() => setPushError(null), 3000)
    return () => clearTimeout(timer)
  }, [pushError])

  // 구독 상태 조회
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const data = await api.get<SubscriptionStatusResponse>('/payments/status')
      setSubscription(data)
    } catch {
      // 결제 API 미설정 시 무시
    }
  }, [])

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [fetchSubscriptionStatus])

  const handlePushToggle = useCallback(async () => {
    if (pushLoading) return
    setPushLoading(true)
    setPushError(null)
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPush()
        if (ok) {
          setPushEnabled(false)
        } else {
          setPushError('알림 해제에 실패했습니다')
        }
      } else {
        const ok = await subscribeToPush()
        if (ok) {
          setPushEnabled(true)
        } else {
          setPushError('알림 설정에 실패했습니다. 브라우저 알림 권한을 확인해주세요.')
        }
      }
    } catch {
      setPushError('알림 설정에 실패했습니다. 브라우저 알림 권한을 확인해주세요.')
    } finally {
      setPushLoading(false)
    }
  }, [pushEnabled, pushLoading])

  const handleApprove = useCallback(async (requestId: string) => {
    setRequestLoading(requestId)
    setRequestError(null)
    try {
      await api.patch(`/join-requests/${requestId}/approve`)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch {
      setRequestError('승인 처리에 실패했습니다')
    } finally {
      setRequestLoading(null)
    }
  }, [])

  const handleReject = useCallback(async (requestId: string) => {
    setRequestLoading(requestId)
    setRequestError(null)
    try {
      await api.patch(`/join-requests/${requestId}/reject`)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch {
      setRequestError('거부 처리에 실패했습니다')
    } finally {
      setRequestLoading(null)
    }
  }, [])

  const handleCancelSubscription = useCallback(async () => {
    if (cancelLoading) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      await api.post('/payments/cancel')
      setConfirmCancelSub(false)
      await fetchSubscriptionStatus()
    } catch {
      setCancelError('구독 해지에 실패했습니다')
    } finally {
      setCancelLoading(false)
    }
  }, [cancelLoading, fetchSubscriptionStatus])

  const handlePremiumSuccess = useCallback(() => {
    fetchSubscriptionStatus()
  }, [fetchSubscriptionStatus])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const handleEditStart = useCallback((fridgeId: string, currentName: string) => {
    setEditingFridgeId(fridgeId)
    setEditName(currentName)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editingFridgeId || !editName.trim()) return

    await updateFridge(editingFridgeId, { name: editName.trim() })
    setEditingFridgeId(null)
    setEditName('')
  }, [editingFridgeId, editName, updateFridge])

  const handleEditCancel = useCallback(() => {
    setEditingFridgeId(null)
    setEditName('')
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingFridgeId) return
    await deleteFridge(deletingFridgeId)
    setDeletingFridgeId(null)
  }, [deletingFridgeId, deleteFridge])

  const handleAddFridge = useCallback(() => {
    navigate('/setup')
  }, [navigate])

  const maskedGroupId = user?.groupId ? `${user.groupId.slice(0, 8)}...` : '-'

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>설정</h1>

      {/* 참여 요청 관리 (관리자만) */}
      {isAdmin && joinRequests.length > 0 && (
        <div className={cx('section')}>
          <div className={cx('sectionTitle')}>참여 요청</div>
          <div className={cx('card')}>
            {requestError && (
              <div className={cx('row')}>
                <span className={cx('pushError')}>{requestError}</span>
              </div>
            )}
            {joinRequests.map((req) => (
              <div key={req.id} className={cx('requestItem')}>
                <div className={cx('requestInfo')}>
                  <span className={cx('requestName')}>{req.userName}</span>
                  <span className={cx('requestEmail')}>{req.userEmail}</span>
                </div>
                <div className={cx('requestActions')}>
                  <button
                    className={cx('approveBtn')}
                    onClick={() => handleApprove(req.id)}
                    disabled={requestLoading === req.id}
                    type="button"
                  >
                    승인
                  </button>
                  <button
                    className={cx('rejectBtn')}
                    onClick={() => handleReject(req.id)}
                    disabled={requestLoading === req.id}
                    type="button"
                  >
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 그룹 정보 */}
      <div className={cx('section')}>
        <div className={cx('sectionTitle')}>그룹 정보</div>
        <div className={cx('card')}>
          <div className={cx('row')}>
            <span className={cx('rowLabel')}>그룹 이름</span>
            <span className={cx('rowValue')}>{groupName ?? '-'}</span>
          </div>
          <div className={cx('row')}>
            <span className={cx('rowLabel')}>그룹 ID</span>
            <span className={cx('rowValue')}>{maskedGroupId}</span>
          </div>
          {isAdmin && groupCode && (
            <div className={cx('row')}>
              <span className={cx('rowLabel')}>초대 코드</span>
              <span className={cx('rowValue', 'groupCode')}>{groupCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* 냉장고 관리 */}
      <div className={cx('section')}>
        <div className={cx('sectionTitle')}>냉장고 관리</div>
        <div className={cx('card')}>
          {fridges.map((fridge) => (
            <div key={fridge.id} className={cx('fridgeItem')}>
              <div className={cx('fridgeInfo')}>
                <span className={cx('fridgeName')}>{fridge.name}</span>
                <span className={cx('fridgeType')}>{FRIDGE_TYPE_LABELS[fridge.type]}</span>
              </div>
              {isAdmin && (
                <div className={cx('fridgeActions')}>
                  <button
                    className={cx('editBtn')}
                    onClick={() => handleEditStart(fridge.id, fridge.name)}
                    type="button"
                  >
                    이름 변경
                  </button>
                  <button
                    className={cx('deleteBtn')}
                    onClick={() => setDeletingFridgeId(fridge.id)}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
          {isAdmin && (
            <button
              className={cx('addFridgeBtn')}
              onClick={handleAddFridge}
              type="button"
            >
              + 냉장고 추가
            </button>
          )}
        </div>
      </div>

      {/* Push 알림 */}
      {isPushSupported() && (
        <div className={cx('section')}>
          <div className={cx('sectionTitle')}>알림</div>
          <div className={cx('card')}>
            <div className={cx('row', 'toggleRow')}>
              <span className={cx('rowLabel')}>유통기한 Push 알림</span>
              <button
                type="button"
                className={cx('toggleSwitch', { toggleOn: pushEnabled })}
                onClick={handlePushToggle}
                disabled={pushLoading}
                aria-label={pushEnabled ? '알림 끄기' : '알림 켜기'}
              >
                <span className={cx('toggleKnob')} />
              </button>
            </div>
            {pushError && (
              <div className={cx('row')}>
                <span className={cx('pushError')}>{pushError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 구독 관리 */}
      {subscription && (
        <div className={cx('section')}>
          <div className={cx('sectionTitle')}>구독 관리</div>
          <div className={cx('card')}>
            <div className={cx('row')}>
              <span className={cx('rowLabel')}>구독 상태</span>
              <span className={cx('subBadge', {
                subActive: subscription.isPremium,
                subInactive: !subscription.isPremium,
              })}>
                {subscription.isPremium ? 'Premium' : subscription.status === 'CANCELLED' ? '해지됨' : '미구독'}
              </span>
            </div>
            {subscription.currentPeriodEnd && (
              <div className={cx('row')}>
                <span className={cx('rowLabel')}>
                  {subscription.status === 'CANCELLED' ? '만료 예정일' : '다음 결제일'}
                </span>
                <span className={cx('rowValue')}>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}
                </span>
              </div>
            )}
            {cancelError && (
              <div className={cx('row')}>
                <span className={cx('pushError')}>{cancelError}</span>
              </div>
            )}
            {isAdmin && (
              <div className={cx('row', 'subActionRow')}>
                {subscription.isPremium && subscription.status === 'ACTIVE' ? (
                  confirmCancelSub ? (
                    <div className={cx('cancelConfirm')}>
                      <span className={cx('cancelConfirmText')}>정말 해지하시겠습니까?</span>
                      <div className={cx('cancelConfirmActions')}>
                        <button
                          className={cx('cancelSubBtn')}
                          onClick={handleCancelSubscription}
                          disabled={cancelLoading}
                          type="button"
                        >
                          {cancelLoading ? '처리 중...' : '해지 확인'}
                        </button>
                        <button
                          className={cx('cancelKeepBtn')}
                          onClick={() => setConfirmCancelSub(false)}
                          disabled={cancelLoading}
                          type="button"
                        >
                          유지하기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={cx('cancelSubBtn')}
                      onClick={() => setConfirmCancelSub(true)}
                      type="button"
                    >
                      구독 해지
                    </button>
                  )
                ) : !subscription.isPremium ? (
                  <button
                    className={cx('subscribeBtn')}
                    onClick={() => setShowPremiumModal(true)}
                    type="button"
                  >
                    Premium 구독하기
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 로그아웃 */}
      <button className={cx('logoutBtn')} onClick={handleLogout} type="button">
        로그아웃
      </button>

      {/* 삭제 확인 모달 */}
      {deletingFridgeId && (
        <div className={cx('editOverlay')} onClick={() => setDeletingFridgeId(null)}>
          <div className={cx('editModal')} onClick={(e) => e.stopPropagation()}>
            <h3 className={cx('editTitle')}>냉장고 삭제</h3>
            <p className={cx('deleteWarning')}>
              이 냉장고와 모든 식재료 데이터가 삭제됩니다.
              <br />
              정말 삭제하시겠습니까?
            </p>
            <div className={cx('editActions')}>
              <button
                className={cx('editCancel')}
                onClick={() => setDeletingFridgeId(null)}
                type="button"
              >
                취소
              </button>
              <button
                className={cx('deleteSave')}
                onClick={handleDeleteConfirm}
                type="button"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium 모달 */}
      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onSuccess={handlePremiumSuccess}
        />
      )}

      {/* 수정 모달 */}
      {editingFridgeId && (
        <div className={cx('editOverlay')} onClick={handleEditCancel}>
          <div className={cx('editModal')} onClick={(e) => e.stopPropagation()}>
            <h3 className={cx('editTitle')}>냉장고 이름 변경</h3>
            <input
              className={cx('editInput')}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <div className={cx('editActions')}>
              <button
                className={cx('editCancel')}
                onClick={handleEditCancel}
                type="button"
              >
                취소
              </button>
              <button
                className={cx('editSave')}
                onClick={handleEditSave}
                type="button"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
