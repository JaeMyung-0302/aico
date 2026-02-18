import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FridgeType, FRIDGE_TYPE_LABELS, FRIDGE_TYPE_DESCRIPTIONS } from '@/types'
import styles from './SetupPage.module.scss'

const cx = classNames.bind(styles)

const FRIDGE_TYPE_ICONS: Record<FridgeType, string> = {
  [FridgeType.ONE_DOOR]: '🚪',
  [FridgeType.TWO_DOOR]: '🧊',
  [FridgeType.SIDE_BY_SIDE]: '📦',
  [FridgeType.FOUR_DOOR]: '🫙',
  [FridgeType.MINI]: '🧃',
}

const FRIDGE_TYPES = Object.values(FridgeType) as FridgeType[]

export const SetupPage = () => {
  const navigate = useNavigate()
  const { createFridge, loading, error } = useFridgeStore()

  const [selectedType, setSelectedType] = useState<FridgeType | null>(null)
  const [name, setName] = useState('')

  const isValid = selectedType !== null && name.trim().length > 0

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isValid || !selectedType || loading) return

      const fridge = await createFridge({ type: selectedType, name: name.trim() })
      if (fridge) {
        navigate('/select', { replace: true })
      }
    },
    [isValid, selectedType, name, loading, createFridge, navigate],
  )

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>냉장고 추가</h1>
      <p className={cx('subtitle')}>냉장고 타입을 선택하고 이름을 지어주세요</p>

      <div className={cx('typeGrid')}>
        {FRIDGE_TYPES.map((type) => (
          <button
            key={type}
            className={cx('typeCard', { typeCardSelected: selectedType === type })}
            onClick={() => setSelectedType(type)}
            type="button"
          >
            <span className={cx('typeIcon')}>{FRIDGE_TYPE_ICONS[type]}</span>
            <span className={cx('typeName')}>{FRIDGE_TYPE_LABELS[type]}</span>
            <span className={cx('typeDesc')}>{FRIDGE_TYPE_DESCRIPTIONS[type]}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className={cx('field')}>
          <label className={cx('label')}>냉장고 이름</label>
          <input
            className={cx('input')}
            type="text"
            placeholder="예: 주방 냉장고, 안방 미니냉장고"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />
        </div>

        <button
          className={cx('submitBtn')}
          type="submit"
          disabled={!isValid || loading}
        >
          {loading ? '추가 중...' : '냉장고 추가하기'}
        </button>
      </form>

      {error && <p className={cx('error')}>{error}</p>}
    </div>
  )
}
