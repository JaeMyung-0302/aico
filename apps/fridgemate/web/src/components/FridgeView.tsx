import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FridgeType, getFillLevel, getDaysUntilExpiry } from '@/types'
import type { CompartmentResponse, FridgeResponse } from '@/types'
import {
  DOOR_SECTIONS,
  SIMPLE_GRID_CLASS,
  getCompartmentPositionClass,
  isDrawerPosition,
  isShowcasePosition,
  isFreezerZone,
} from '@/utils/fridgeLayout'
import styles from './FridgeView.module.scss'

const cx = classNames.bind(styles)

interface FridgeViewProps {
  onCompartmentClick: (compartment: CompartmentResponse) => void
  onDeleteItem: (itemId: string, compartmentId: string, itemName: string) => void
  onQuickAdd?: (compartmentId: string) => void
  highlightedCompartmentId?: string | null
  onEditCompartments?: () => void
}

// === 칸 셀 컴포넌트 ===

const FILL_LEVEL_CLASS: Record<number, string | undefined> = {
  0: 'fillLevel0',
  2: 'fillLevel2',
  3: 'fillLevel3',
}

const CompartmentCell = ({
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
  onDeleteItem: (itemId: string, compartmentId: string, itemName: string) => void
  onQuickAdd?: () => void
  className?: string
  isHighlighted?: boolean
}) => {
  const fillLevel = getFillLevel(compartment.itemCount)

  // 유통기한 가까운 순 정렬 (null은 맨 뒤)
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
        compartmentFreezer: isFreezerZone(fridgeType, compartment.position, compartment.type),
        compartmentDrawer: isDrawerPosition(fridgeType, compartment.position),
        compartmentShowcase: isShowcasePosition(fridgeType, compartment.position),
        compartmentExpiring: compartment.hasExpiringItems && compartment.itemCount > 0,
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
                    <span className={cx('chipExpiry', {
                      chipExpiryDanger: days !== null && days <= 1,
                      chipExpiryWarning: days !== null && days > 1 && days <= 3,
                    })}>{expiry}</span>
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
            {compartment.hasExpiringItems && <span className={cx('warningDot')} />}
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

// === 도어 섹션 기반 냉장고 (SIDE_BY_SIDE, FOUR_DOOR) ===

const DoorSectionGrid = ({
  fridge,
  onCompartmentClick,
  onDeleteItem,
  onQuickAdd,
  highlightedCompartmentId,
  onEditCompartments,
}: {
  fridge: FridgeResponse
  onCompartmentClick: (compartment: CompartmentResponse) => void
  onDeleteItem: (itemId: string, compartmentId: string, itemName: string) => void
  onQuickAdd?: (compartmentId: string) => void
  highlightedCompartmentId?: string | null
  onEditCompartments?: () => void
}) => {
  const [selectedDoor, setSelectedDoor] = useState<number | null>(null)
  const doorSections = DOOR_SECTIONS[fridge.type]!
  const compartmentMap = new Map(fridge.compartments.map((c) => [c.position, c]))

  // === 열린 상태: 세부 칸 표시 ===
  if (selectedDoor !== null) {
    const activeSection = doorSections[selectedDoor] ?? doorSections[0]!
    const sectionCompartments = activeSection.positions
      .map((pos) => compartmentMap.get(pos))
      .filter((c): c is CompartmentResponse => c !== undefined)

    const renderOpenContent = () => {
      // 단일 칸: 그리드 없이 직접 표시
      if (sectionCompartments.length === 1) {
        const comp = sectionCompartments[0]!
        return (
          <CompartmentCell
            compartment={comp}
            fridgeType={fridge.type}
            onClick={() => onCompartmentClick(comp)}
            onDeleteItem={onDeleteItem}
            onQuickAdd={onQuickAdd ? () => onQuickAdd(comp.id) : undefined}
            isHighlighted={comp.id === highlightedCompartmentId}
          />
        )
      }
      if (activeSection.layout === 'column') {
        return (
          <div className={cx('fridgeColumn')}>
            {sectionCompartments.map((comp) => (
              <CompartmentCell
                key={comp.id}
                compartment={comp}
                fridgeType={fridge.type}
                onClick={() => onCompartmentClick(comp)}
                onDeleteItem={onDeleteItem}
                onQuickAdd={onQuickAdd ? () => onQuickAdd(comp.id) : undefined}
                isHighlighted={comp.id === highlightedCompartmentId}
              />
            ))}
          </div>
        )
      }
      if (activeSection.layout === 'twoColumn') {
        const leftItems = sectionCompartments.slice(0, activeSection.columnSplit!)
        const rightItems = sectionCompartments.slice(activeSection.columnSplit!)
        return (
          <div className={cx('twoColumnLayout')}>
            <div className={cx('fridgeColumn')}>
              {leftItems.map((comp) => (
                <CompartmentCell
                  key={comp.id}
                  compartment={comp}
                  fridgeType={fridge.type}
                  onClick={() => onCompartmentClick(comp)}
                  onDeleteItem={onDeleteItem}
                  onQuickAdd={onQuickAdd ? () => onQuickAdd(comp.id) : undefined}
                  isHighlighted={comp.id === highlightedCompartmentId}
                />
              ))}
            </div>
            <div className={cx('fridgeColumn')}>
              {rightItems.map((comp) => (
                <CompartmentCell
                  key={comp.id}
                  compartment={comp}
                  fridgeType={fridge.type}
                  onClick={() => onCompartmentClick(comp)}
                  onDeleteItem={onDeleteItem}
                  onQuickAdd={onQuickAdd ? () => onQuickAdd(comp.id) : undefined}
                  isHighlighted={comp.id === highlightedCompartmentId}
                />
              ))}
            </div>
          </div>
        )
      }
      return (
        <div className={cx(activeSection.layout === 'grid3x2' ? 'gridLayout3x2' : 'gridLayout2x1')}>
          {sectionCompartments.map((comp) => (
            <CompartmentCell
              key={comp.id}
              compartment={comp}
              fridgeType={fridge.type}
              onClick={() => onCompartmentClick(comp)}
              onDeleteItem={onDeleteItem}
              onQuickAdd={onQuickAdd ? () => onQuickAdd(comp.id) : undefined}
              isHighlighted={comp.id === highlightedCompartmentId}
            />
          ))}
        </div>
      )
    }

    return (
      <div className={cx('fridge')}>
        <button
          className={cx('fridgeBack')}
          onClick={() => setSelectedDoor(null)}
          type="button"
        >
          ← {fridge.name}
        </button>
        <div className={cx('doorLabel')}>{activeSection.label}</div>
        <div className={cx('doorContent')}>{renderOpenContent()}</div>
      </div>
    )
  }

  // === 닫힌 상태: 문 버튼 표시 ===
  const closedClass =
    fridge.type === FridgeType.SIDE_BY_SIDE ? 'closedSideBySide' : 'closedFourDoor'

  return (
    <div className={cx('fridge')}>
      <div className={cx('fridgeHeader')}>
        {fridge.name}
        {onEditCompartments && (
          <button className={cx('editCompartmentsBtn')} onClick={onEditCompartments} type="button">
            칸 편집
          </button>
        )}
      </div>
      <div className={cx('closedDoors', closedClass)}>
        {doorSections.map((section, i) => {
          const comps = section.positions
            .map((pos) => compartmentMap.get(pos))
            .filter((c): c is CompartmentResponse => c !== undefined)
          const totalItems = comps.reduce((sum, c) => sum + c.itemCount, 0)
          const hasExpiring = comps.some((c) => c.hasExpiringItems)
          const doorFillLevel = getFillLevel(totalItems)
          const doorFillClass = doorFillLevel > 0 ? `closedDoorFillLevel${doorFillLevel}` : undefined

          return (
            <button
              key={section.label}
              className={cx('closedDoor', doorFillClass, {
                closedDoorFreezer: section.isFreezer,
                closedDoorFull: section.spanFull,
              })}
              onClick={() => setSelectedDoor(i)}
              type="button"
            >
              <div className={cx('closedDoorHandle')} />
              <span className={cx('closedDoorLabel')}>{section.label}</span>
              <div className={cx('closedDoorInfo')}>
                <span className={cx('closedDoorCount')}>
                  {totalItems > 0 ? `${totalItems}개` : '비어있음'}
                </span>
                {hasExpiring && <span className={cx('warningDot')} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// === 기존 그리드 기반 냉장고 (ONE_DOOR, TWO_DOOR, MINI) ===

const SimpleFridgeGrid = ({
  fridge,
  onCompartmentClick,
  onDeleteItem,
  onQuickAdd,
  highlightedCompartmentId,
  onEditCompartments,
}: {
  fridge: FridgeResponse
  onCompartmentClick: (compartment: CompartmentResponse) => void
  onDeleteItem: (itemId: string, compartmentId: string, itemName: string) => void
  onQuickAdd?: (compartmentId: string) => void
  highlightedCompartmentId?: string | null
  onEditCompartments?: () => void
}) => {
  const gridClass = SIMPLE_GRID_CLASS[fridge.type]

  return (
    <div className={cx('fridge')}>
      <div className={cx('fridgeHeader')}>
        {fridge.name}
        {onEditCompartments && (
          <button className={cx('editCompartmentsBtn')} onClick={onEditCompartments} type="button">
            칸 편집
          </button>
        )}
      </div>
      <div className={cx('doorContent')}>
        <div className={cx(gridClass)}>
          {fridge.compartments
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((compartment) => (
              <CompartmentCell
                key={compartment.id}
                compartment={compartment}
                fridgeType={fridge.type}
                onClick={() => onCompartmentClick(compartment)}
                onDeleteItem={onDeleteItem}
                onQuickAdd={onQuickAdd ? () => onQuickAdd(compartment.id) : undefined}
                className={getCompartmentPositionClass(fridge.type, compartment.position)}
                isHighlighted={compartment.id === highlightedCompartmentId}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

// === 메인 컴포넌트 ===

export const FridgeView = ({ onCompartmentClick, onDeleteItem, onQuickAdd, highlightedCompartmentId, onEditCompartments }: FridgeViewProps) => {
  const navigate = useNavigate()
  const { fridges, activeFridgeId, setActiveFridge } = useFridgeStore()

  const activeFridge = fridges.find((f) => f.id === activeFridgeId) ?? null

  if (fridges.length === 0) {
    return (
      <div className={cx('empty')}>
        <span className={cx('emptyIcon')}>🧊</span>
        <p className={cx('emptyText')}>
          아직 등록된 냉장고가 없어요.
          <br />
          냉장고를 추가해 보세요!
        </p>
        <button
          className={cx('addButton')}
          onClick={() => navigate('/setup')}
          type="button"
        >
          냉장고 추가하기
        </button>
      </div>
    )
  }

  return (
    <div className={cx('container')}>
      {/* 냉장고 탭 (복수 냉장고) */}
      {fridges.length > 1 && (
        <div className={cx('fridgeTabs')}>
          {fridges.map((fridge) => (
            <button
              key={fridge.id}
              className={cx('fridgeTab', { fridgeTabActive: fridge.id === activeFridgeId })}
              onClick={() => setActiveFridge(fridge.id)}
              type="button"
            >
              {fridge.name}
            </button>
          ))}
        </div>
      )}

      {/* 냉장고 그리드 */}
      {activeFridge &&
        (DOOR_SECTIONS[activeFridge.type] ? (
          <DoorSectionGrid key={activeFridge.id} fridge={activeFridge} onCompartmentClick={onCompartmentClick} onDeleteItem={onDeleteItem} onQuickAdd={onQuickAdd} highlightedCompartmentId={highlightedCompartmentId} onEditCompartments={onEditCompartments} />
        ) : (
          <SimpleFridgeGrid key={activeFridge.id} fridge={activeFridge} onCompartmentClick={onCompartmentClick} onDeleteItem={onDeleteItem} onQuickAdd={onQuickAdd} highlightedCompartmentId={highlightedCompartmentId} onEditCompartments={onEditCompartments} />
        ))}
    </div>
  )
}
