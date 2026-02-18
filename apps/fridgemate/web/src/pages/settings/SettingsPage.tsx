import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useGroupStore } from '@/stores/useGroupStore'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FRIDGE_TYPE_LABELS } from '@/types'
import styles from './SettingsPage.module.scss'

const cx = classNames.bind(styles)

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { groupId, groupName, logout } = useGroupStore()
  const { fridges, fetchFridges, updateFridge, deleteFridge } = useFridgeStore()

  const [editingFridgeId, setEditingFridgeId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingFridgeId, setDeletingFridgeId] = useState<string | null>(null)

  useEffect(() => {
    fetchFridges()
  }, [fetchFridges])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/', { replace: true })
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

  // 그룹 코드 표시용 (앞 4자리만 보여주기)
  const maskedGroupId = groupId ? `${groupId.slice(0, 8)}...` : '-'

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>설정</h1>

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
            </div>
          ))}
          <button
            className={cx('addFridgeBtn')}
            onClick={handleAddFridge}
            type="button"
          >
            + 냉장고 추가
          </button>
        </div>
      </div>

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
