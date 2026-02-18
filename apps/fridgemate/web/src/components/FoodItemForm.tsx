import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import classNames from 'classnames/bind'
import { useFoodItemStore } from '@/stores/useFoodItemStore'
import { FoodCategory, FOOD_CATEGORY_LABELS } from '@/types'
import type { FoodItemResponse, CreateFoodItemInput, UpdateFoodItemInput } from '@/types'
import styles from './FoodItemForm.module.scss'

const cx = classNames.bind(styles)

interface FoodItemFormProps {
  compartmentId: string
  editItem?: FoodItemResponse | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORY_OPTIONS = Object.values(FoodCategory).map((value) => ({
  value,
  label: FOOD_CATEGORY_LABELS[value],
}))

export const FoodItemForm = ({
  compartmentId,
  editItem,
  onClose,
  onSuccess,
}: FoodItemFormProps) => {
  const { createItem, updateItem } = useFoodItemStore()

  const [name, setName] = useState(editItem?.name ?? '')
  const [category, setCategory] = useState<FoodCategory>(editItem?.category ?? FoodCategory.OTHER)
  const [quantity, setQuantity] = useState(editItem?.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(editItem?.unit ?? '')
  const [expiryDate, setExpiryDate] = useState(editItem?.expiryDate?.slice(0, 10) ?? '')
  const [memo, setMemo] = useState(editItem?.memo ?? '')
  const [submitting, setSubmitting] = useState(false)

  const isEditing = editItem !== null && editItem !== undefined
  const isValid = name.trim().length > 0

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isValid || submitting) return

      setSubmitting(true)

      try {
        if (isEditing) {
          const input: UpdateFoodItemInput = {
            name: name.trim(),
            category,
            quantity: quantity ? Number(quantity) : null,
            unit: unit || null,
            expiryDate: expiryDate || null,
            memo: memo || null,
          }
          await updateItem(editItem.id, compartmentId, input)
        } else {
          const input: CreateFoodItemInput = {
            name: name.trim(),
            category,
            quantity: quantity ? Number(quantity) : null,
            unit: unit || null,
            expiryDate: expiryDate || null,
            memo: memo || null,
          }
          await createItem(compartmentId, input)
        }
        onSuccess()
      } finally {
        setSubmitting(false)
      }
    },
    [
      name, category, quantity, unit, expiryDate, memo,
      isValid, submitting, isEditing, editItem,
      compartmentId, createItem, updateItem, onSuccess,
    ],
  )

  const handleOverlayClick = useCallback(() => {
    onClose()
  }, [onClose])

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <div className={cx('overlay')} onClick={handleOverlayClick}>
      <div className={cx('modal')} onClick={handleModalClick}>
        <div className={cx('header')}>
          <h3 className={cx('title')}>{isEditing ? '식재료 수정' : '식재료 추가'}</h3>
          <button className={cx('closeBtn')} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className={cx('form')} onSubmit={handleSubmit}>
          <div className={cx('field')}>
            <label className={cx('label')}>
              이름<span className={cx('required')}>*</span>
            </label>
            <input
              className={cx('input')}
              type="text"
              placeholder="식재료 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={cx('field')}>
            <label className={cx('label')}>카테고리</label>
            <select
              className={cx('select')}
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={cx('row')}>
            <div className={cx('field', 'rowField')}>
              <label className={cx('label')}>수량</label>
              <input
                className={cx('input')}
                type="number"
                placeholder="예: 3"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="any"
              />
            </div>
            <div className={cx('field', 'rowField')}>
              <label className={cx('label')}>단위</label>
              <input
                className={cx('input')}
                type="text"
                placeholder="예: 개, kg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className={cx('field')}>
            <label className={cx('label')}>유통기한</label>
            <input
              className={cx('input')}
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className={cx('field')}>
            <label className={cx('label')}>메모</label>
            <textarea
              className={cx('textarea')}
              placeholder="메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>

          <button
            className={cx('submitBtn')}
            type="submit"
            disabled={!isValid || submitting}
          >
            {submitting ? '저장 중...' : isEditing ? '수정하기' : '추가하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
