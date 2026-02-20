import { useMemo, useState } from 'react'
import classNames from 'classnames/bind'
import { FoodCategory, FOOD_CATEGORY_LABELS, FOOD_CATEGORY_ICONS } from '@/types'
import styles from './IngredientSelector.module.scss'

const cx = classNames.bind(styles)

const CATEGORY_THRESHOLD = 10
const COLLAPSED_CHIP_COUNT = 8

const CATEGORY_ORDER: FoodCategory[] = [
  FoodCategory.VEGETABLE,
  FoodCategory.MEAT,
  FoodCategory.SEAFOOD,
  FoodCategory.DAIRY,
  FoodCategory.SEASONING,
  FoodCategory.SIDE_DISH,
  FoodCategory.SNACK,
  FoodCategory.BEVERAGE,
  FoodCategory.OTHER,
]

interface IngredientItem {
  id: string
  name: string
  category?: FoodCategory
}

interface IngredientSelectorProps {
  items: IngredientItem[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
}

export const IngredientSelector = ({ items, selectedIds, onToggle, onToggleAll }: IngredientSelectorProps) => {
  const allSelected = items.length > 0 && selectedIds.size === items.length
  const [searchQuery, setSearchQuery] = useState('')
  const [openCategories, setOpenCategories] = useState<Set<FoodCategory>>(() => new Set(CATEGORY_ORDER))
  const [expandedCategories, setExpandedCategories] = useState<Set<FoodCategory>>(new Set())

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.trim().toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(query))
  }, [items, searchQuery])

  const groupedItems = useMemo(() => {
    const groups = new Map<FoodCategory, IngredientItem[]>()
    for (const item of filteredItems) {
      const category = item.category ?? FoodCategory.OTHER
      const existing = groups.get(category) ?? []
      groups.set(category, [...existing, item])
    }
    return groups
  }, [filteredItems])

  const toggleCategory = (category: FoodCategory) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const toggleExpand = (category: FoodCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const useGrouped = items.length >= CATEGORY_THRESHOLD

  return (
    <div className={cx('selector')}>
      <div className={cx('header')}>
        <span className={cx('label')}>
          재료 선택
          <span className={cx('selectedCount')}>
            {selectedIds.size}/{items.length}
          </span>
        </span>
        <button className={cx('toggleAll')} onClick={onToggleAll} type="button">
          {allSelected ? '전체 해제' : '전체 선택'}
        </button>
      </div>

      {useGrouped ? (
        <>
          <input
            className={cx('searchInput')}
            type="text"
            placeholder="재료 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="재료 검색"
          />
          <div className={cx('groupList')}>
            {filteredItems.length === 0 && (
              <p className={cx('noResult')}>검색 결과가 없습니다</p>
            )}
            {CATEGORY_ORDER.filter((cat) => groupedItems.has(cat)).map((category) => {
              const categoryItems = groupedItems.get(category)!
              const isOpen = openCategories.has(category)
              const selectedCount = categoryItems.filter((item) => selectedIds.has(item.id)).length

              return (
                <div key={category} className={cx('categoryGroup')}>
                  <button
                    className={cx('categoryHeader')}
                    onClick={() => toggleCategory(category)}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`category-${category}`}
                  >
                    <span className={cx('categoryIcon')} aria-hidden="true">{FOOD_CATEGORY_ICONS[category]}</span>
                    <span className={cx('categoryLabel')}>{FOOD_CATEGORY_LABELS[category]}</span>
                    <span className={cx('categoryCount')}>
                      {selectedCount}/{categoryItems.length}
                    </span>
                    <span className={cx('chevron', { chevronOpen: isOpen })} aria-hidden="true">›</span>
                  </button>
                  {isOpen && (() => {
                    const isExpanded = expandedCategories.has(category)
                    const hasOverflow = categoryItems.length > COLLAPSED_CHIP_COUNT
                    const visibleItems = !hasOverflow || isExpanded ? categoryItems : categoryItems.slice(0, COLLAPSED_CHIP_COUNT)
                    const hiddenCount = categoryItems.length - COLLAPSED_CHIP_COUNT

                    return (
                      <div id={`category-${category}`} role="region">
                        <div className={cx('categoryChipList')}>
                          {visibleItems.map((item) => (
                            <button
                              key={item.id}
                              className={cx('chip', { chipSelected: selectedIds.has(item.id) })}
                              onClick={() => onToggle(item.id)}
                              type="button"
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                        {hasOverflow && (
                          <button
                            className={cx('expandToggle')}
                            onClick={() => toggleExpand(category)}
                            type="button"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? '접기' : `+${hiddenCount}개 더보기`}
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className={cx('chipList')}>
          {items.map((item) => (
            <button
              key={item.id}
              className={cx('chip', { chipSelected: selectedIds.has(item.id) })}
              onClick={() => onToggle(item.id)}
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
