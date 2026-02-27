import { useEffect, useState, useCallback } from 'react'
import classNames from 'classnames/bind'
import { useFoodItemStore } from '@/stores/useFoodItemStore'
import { ExpiryBadge } from '@/components/ExpiryBadge'
import { FoodItemForm } from '@/components/FoodItemForm'
import { FOOD_CATEGORY_LABELS } from '@/types'
import type { CompartmentResponse, FoodItemResponse } from '@/types'
import styles from './CompartmentPanel.module.scss'

const cx = classNames.bind(styles)

interface CompartmentPanelProps {
  compartment: CompartmentResponse
  onClose: () => void
  onItemChange?: () => void
}

export const CompartmentPanel = ({
  compartment,
  onClose,
  onItemChange,
}: CompartmentPanelProps) => {
  const { items, loading, fetchItems, deleteItem } = useFoodItemStore()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<FoodItemResponse | null>(null)

  const compartmentItems = items[compartment.id] ?? []

  useEffect(() => {
    fetchItems(compartment.id)
  }, [compartment.id, fetchItems])

  const handleOverlayClick = useCallback(() => {
    onClose()
  }, [onClose])

  const handleDelete = useCallback(
    async (itemId: string) => {
      await deleteItem(itemId, compartment.id)
      onItemChange?.()
    },
    [deleteItem, compartment.id, onItemChange],
  )

  const handleEdit = useCallback((item: FoodItemResponse) => {
    setEditingItem(item)
    setShowForm(true)
  }, [])

  const handleFormClose = useCallback(() => {
    setShowForm(false)
    setEditingItem(null)
  }, [])

  const handleFormSuccess = useCallback(() => {
    setShowForm(false)
    setEditingItem(null)
    fetchItems(compartment.id)
    onItemChange?.()
  }, [fetchItems, compartment.id, onItemChange])

  const formatQuantity = (item: FoodItemResponse): string => {
    if (item.quantity === null) return ''
    const unit = item.unit ?? ''
    return `${item.quantity}${unit}`
  }

  return (
    <>
      <div className={cx('overlay')} onClick={handleOverlayClick} />
      <div className={cx('panel')}>
        <div className={cx('handle')} />
        <div className={cx('header')}>
          <h2 className={cx('title')}>{compartment.label}</h2>
          <button
            className={cx('addBtn')}
            onClick={() => setShowForm(true)}
            type="button"
          >
            + 추가
          </button>
        </div>

        <div className={cx('list')}>
          {loading && compartmentItems.length === 0 && (
            <div className={cx('loading')}>불러오는 중...</div>
          )}

          {!loading && compartmentItems.length === 0 && (
            <div className={cx('emptyList')}>
              <span>📭</span>
              <span>이 칸은 비어있어요</span>
            </div>
          )}

          {compartmentItems.map((item) => (
            <div key={item.id} className={cx('item')}>
              <div className={cx('itemInfo')} onClick={() => handleEdit(item)}>
                <div className={cx('itemName')}>{item.name}</div>
                <div className={cx('itemMeta')}>
                  {FOOD_CATEGORY_LABELS[item.category]}
                  {formatQuantity(item) && ` · ${formatQuantity(item)}`}
                </div>
              </div>
              <div className={cx('itemActions')}>
                <ExpiryBadge expiryDate={item.expiryDate} />
                <button
                  className={cx('deleteBtn')}
                  onClick={() => handleDelete(item.id)}
                  type="button"
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <FoodItemForm
          compartmentId={compartment.id}
          editItem={editingItem}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  )
}
