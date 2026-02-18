import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FridgeType, CompartmentType, getFillLevel } from '@/types'
import type { CompartmentResponse, FridgeResponse } from '@/types'
import { useFoodItemStore, getCategoryPreview } from '@/stores/useFoodItemStore'
import styles from './FridgeView.module.scss'

const cx = classNames.bind(styles)

interface FridgeViewProps {
  onCompartmentClick: (compartment: CompartmentResponse) => void
  highlightedCompartmentId?: string | null
}

// === 도어 섹션 정의 (SIDE_BY_SIDE, FOUR_DOOR) ===

interface DoorSection {
  label: string
  positions: number[]
  layout: 'twoColumn' | 'column' | 'grid3x2' | 'grid2x1'
  columnSplit?: number // twoColumn에서 좌/우 구분 인덱스
  isFreezer?: boolean
  spanFull?: boolean // 닫힌 상태에서 전체 너비 차지
}

const DOOR_SECTIONS: Partial<Record<FridgeType, DoorSection[]>> = {
  [FridgeType.SIDE_BY_SIDE]: [
    {
      label: '냉동실',
      positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      layout: 'twoColumn',
      columnSplit: 5,
      isFreezer: true,
    },
    {
      label: '냉장실',
      positions: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
      layout: 'twoColumn',
      columnSplit: 6,
    },
  ],
  [FridgeType.FOUR_DOOR]: [
    { label: '좌측', positions: [0, 1, 2, 3, 4, 5], layout: 'twoColumn', columnSplit: 3 },
    { label: '우측', positions: [6, 7, 8, 9, 10, 11], layout: 'twoColumn', columnSplit: 3 },
    { label: '하단 좌', positions: [12], layout: 'grid2x1', spanFull: true },
    { label: '하단 우', positions: [13], layout: 'grid2x1', spanFull: true },
  ],
}

// 서랍 위치 (높이를 낮게 표시)
const isDrawerPosition = (fridgeType: FridgeType, position: number): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) return [9, 10, 15, 16].includes(position)
  return false
}

// 쇼케이스 위치 (별도 스타일)
const isShowcasePosition = (fridgeType: FridgeType, position: number): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) return position >= 17
  return false
}

// 냉동 영역 판별
const isFreezerZone = (
  fridgeType: FridgeType,
  position: number,
  compartmentType: CompartmentType,
): boolean => {
  if (fridgeType === FridgeType.SIDE_BY_SIDE) return position <= 10
  if (fridgeType === FridgeType.FOUR_DOOR) return false
  return compartmentType === CompartmentType.FREEZER
}

// === 기존 그리드 (ONE_DOOR, TWO_DOOR, MINI용) ===

const SIMPLE_GRID_CLASS: Partial<Record<FridgeType, string>> = {
  [FridgeType.ONE_DOOR]: 'gridOneDoor',
  [FridgeType.TWO_DOOR]: 'gridTwoDoor',
  [FridgeType.MINI]: 'gridMini',
}

const getCompartmentPositionClass = (
  fridgeType: FridgeType,
  position: number,
): string => {
  const map: Partial<Record<FridgeType, Record<number, string>>> = {
    [FridgeType.ONE_DOOR]: {
      0: 'oneDoorFridgeUpper',
      1: 'oneDoorFridgeLower',
      2: 'oneDoorFreezer',
      3: 'oneDoorDoor',
    },
    [FridgeType.TWO_DOOR]: {
      0: 'twoDoorFridgeUpper',
      1: 'twoDoorFridgeLower',
      2: 'twoDoorFreezer',
      3: 'twoDoorDoor',
      4: 'twoDoorDrawer',
      5: 'twoDoorVeggie',
    },
    [FridgeType.MINI]: {
      0: 'miniFridgeUpper',
      1: 'miniFreezer',
      2: 'miniDoor',
    },
  }
  return map[fridgeType]?.[position] ?? ''
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
  className,
  isHighlighted,
}: {
  compartment: CompartmentResponse
  fridgeType: FridgeType
  onClick: () => void
  className?: string
  isHighlighted?: boolean
}) => {
  const fillLevel = getFillLevel(compartment.itemCount)
  const cachedItems = useFoodItemStore((s) => s.items[compartment.id])
  const preview = cachedItems ? getCategoryPreview(cachedItems) : null

  return (
    <button
      className={cx('compartment', className, FILL_LEVEL_CLASS[fillLevel], {
        compartmentFreezer: isFreezerZone(fridgeType, compartment.position, compartment.type),
        compartmentDrawer: isDrawerPosition(fridgeType, compartment.position),
        compartmentShowcase: isShowcasePosition(fridgeType, compartment.position),
        compartmentExpiring: compartment.hasExpiringItems && compartment.itemCount > 0,
        compartmentHighlighted: isHighlighted,
      })}
      onClick={onClick}
      type="button"
    >
      <span className={cx('compartmentLabel')}>{compartment.label}</span>
      {fillLevel === 0 ? (
        <span className={cx('emptyPlus')}>+</span>
      ) : (
        <>
          {preview && preview.icons.length > 0 && (
            <div className={cx('categoryPreview')}>
              {preview.icons.map((icon, i) => (
                <span key={i}>{icon}</span>
              ))}
              {preview.extraCount > 0 && <span className={cx('categoryExtra')}>+{preview.extraCount}</span>}
            </div>
          )}
          <div className={cx('compartmentInfo')}>
            <span className={cx('itemCount')}>{compartment.itemCount}개</span>
            {compartment.hasExpiringItems && <span className={cx('warningDot')} />}
          </div>
        </>
      )}
    </button>
  )
}

// === 도어 섹션 기반 냉장고 (SIDE_BY_SIDE, FOUR_DOOR) ===

const DoorSectionGrid = ({
  fridge,
  onCompartmentClick,
  highlightedCompartmentId,
}: {
  fridge: FridgeResponse
  onCompartmentClick: (compartment: CompartmentResponse) => void
  highlightedCompartmentId?: string | null
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
      <div className={cx('fridgeHeader')}>{fridge.name}</div>
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
  highlightedCompartmentId,
}: {
  fridge: FridgeResponse
  onCompartmentClick: (compartment: CompartmentResponse) => void
  highlightedCompartmentId?: string | null
}) => {
  const gridClass = SIMPLE_GRID_CLASS[fridge.type]

  return (
    <div className={cx('fridge')}>
      <div className={cx('fridgeHeader')}>{fridge.name}</div>
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

export const FridgeView = ({ onCompartmentClick, highlightedCompartmentId }: FridgeViewProps) => {
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
          <DoorSectionGrid key={activeFridge.id} fridge={activeFridge} onCompartmentClick={onCompartmentClick} highlightedCompartmentId={highlightedCompartmentId} />
        ) : (
          <SimpleFridgeGrid key={activeFridge.id} fridge={activeFridge} onCompartmentClick={onCompartmentClick} highlightedCompartmentId={highlightedCompartmentId} />
        ))}
    </div>
  )
}
