import classNames from 'classnames/bind'
import {
  FridgeType,
  getFillLevel,
  getDaysUntilExpiry,
} from '@/types'
import type { CompartmentResponse } from '@/types'
import {
  isFreezerZone,
  isDrawerPosition,
  isShowcasePosition,
} from '@/utils/fridgeLayout'
import styles from './FridgeView.module.scss'

const cx = classNames.bind(styles)

const FILL_LEVEL_CLASS: Record<number, string | undefined> = {
  0: 'fillLevel0',
  2: 'fillLevel2',
  3: 'fillLevel3',
}

export const CompartmentCell = ({
  compartment,
  fridgeType,
  onClick,
  onDeleteItem,
  onQuickAdd,
  className,
  isHighlighted,
}: {
  compartment: CompartmentResponse
  fridgeType: FridgeType
  onClick: () => void
  onDeleteItem: (
    itemId: string,
    compartmentId: string,
    itemName: string,
  ) => void
  onQuickAdd?: () => void
  className?: string
  isHighlighted?: boolean
}) => {
  const fillLevel = getFillLevel(compartment.itemCount)

  const sortedItems = compartment.foodItems.slice().sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  })

  const formatExpiry = (expiryDate: string | null): string | null => {
    const days = getDaysUntilExpiry(expiryDate)
    if (days === null) return null
    if (days <= 0) return 'D-day'
    return `D-${days}`
  }

  return (
    <div
      className={cx('compartment', className, FILL_LEVEL_CLASS[fillLevel], {
        compartmentFreezer: isFreezerZone(
          fridgeType,
          compartment.position,
          compartment.type,
        ),
        compartmentDrawer: isDrawerPosition(fridgeType, compartment.position),
        compartmentShowcase: isShowcasePosition(
          fridgeType,
          compartment.position,
        ),
        compartmentExpiring:
          compartment.hasExpiringItems && compartment.itemCount > 0,
        compartmentHighlighted: isHighlighted,
      })}
      onClick={fillLevel === 0 && onQuickAdd ? onQuickAdd : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (fillLevel === 0 && onQuickAdd) {
            onQuickAdd()
          } else {
            onClick()
          }
        }
      }}
    >
      <span className={cx('compartmentLabel')}>{compartment.label}</span>
      {fillLevel === 0 ? (
        <span className={cx('emptyPlus')}>+</span>
      ) : (
        <>
          <div className={cx('chipList')}>
            {sortedItems.map((item) => {
              const expiry = formatExpiry(item.expiryDate)
              const days = getDaysUntilExpiry(item.expiryDate)
              return (
                <span key={item.id} className={cx('chip')}>
                  <span className={cx('chipName')}>{item.name}</span>
                  {expiry && (
                    <span
                      className={cx('chipExpiry', {
                        chipExpiryDanger: days !== null && days <= 1,
                        chipExpiryWarning:
                          days !== null && days > 1 && days <= 3,
                      })}
                    >
                      {expiry}
                    </span>
                  )}
                  <button
                    className={cx('chipDelete')}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteItem(item.id, compartment.id, item.name)
                    }}
                    type="button"
                    aria-label={`${item.name} 삭제`}
                  >
                    ✕
                  </button>
                </span>
              )
            })}
          </div>
          <div className={cx('compartmentInfo')}>
            <span className={cx('itemCount')}>{compartment.itemCount}개</span>
            {compartment.hasExpiringItems && (
              <span className={cx('warningDot')} />
            )}
            {onQuickAdd && (
              <button
                className={cx('quickAddBtn')}
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickAdd()
                }}
                type="button"
                aria-label="식재료 추가"
              >
                +
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
