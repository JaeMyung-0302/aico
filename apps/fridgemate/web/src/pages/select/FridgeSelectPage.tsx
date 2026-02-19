import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FridgeType, FRIDGE_TYPE_LABELS } from '@/types'
import type { FridgeResponse } from '@/types'
import { FridgeTypeIcon } from '@/components/FridgeTypeIcon'
import styles from './FridgeSelectPage.module.scss'

const cx = classNames.bind(styles)

const FridgeCard = ({
  fridge,
  onClick,
}: {
  fridge: FridgeResponse
  onClick: () => void
}) => {
  const totalItems = fridge.compartments.reduce((sum, c) => sum + c.itemCount, 0)
  const hasExpiring = fridge.compartments.some((c) => c.hasExpiringItems)

  return (
    <button className={cx('card')} onClick={onClick} type="button">
      <div className={cx('cardIcon')}>
        <FridgeTypeIcon type={fridge.type} size={48} />
      </div>
      <div className={cx('cardContent')}>
        <span className={cx('cardName')}>{fridge.name}</span>
        <span className={cx('cardType')}>{FRIDGE_TYPE_LABELS[fridge.type]}</span>
        <span className={cx('cardInfo')}>
          {fridge.compartments.length}칸 · {totalItems}개 식재료
          {hasExpiring && <span className={cx('cardWarning')}> · 유통기한 주의</span>}
        </span>
      </div>
      <span className={cx('cardArrow')}>›</span>
    </button>
  )
}

export const FridgeSelectPage = () => {
  const navigate = useNavigate()
  const { fridges, fetchFridges, setActiveFridge, loading, error } = useFridgeStore()

  useEffect(() => {
    fetchFridges()
  }, [fetchFridges])

  const handleSelect = (fridge: FridgeResponse) => {
    setActiveFridge(fridge.id)
    navigate('/fridge')
  }

  if (loading) {
    return (
      <div className={cx('page')}>
        <div className={cx('loading')}>냉장고를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cx('page')}>
        <div className={cx('error')}>
          <p>{error}</p>
          <button className={cx('retryBtn')} onClick={() => fetchFridges()} type="button">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>냉장고 선택</h1>
      <p className={cx('subtitle')}>관리할 냉장고를 선택하세요</p>

      {fridges.length === 0 ? (
        <div className={cx('empty')}>
          <p>등록된 냉장고가 없습니다</p>
          <button
            className={cx('addBtn')}
            onClick={() => navigate('/setup')}
            type="button"
          >
            냉장고 추가하기
          </button>
        </div>
      ) : (
        <div className={cx('list')}>
          {fridges.map((fridge) => (
            <FridgeCard
              key={fridge.id}
              fridge={fridge}
              onClick={() => handleSelect(fridge)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
