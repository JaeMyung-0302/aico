import { useCallback, useEffect, useMemo, useState } from 'react'
import classNames from 'classnames/bind'
import {
  FridgeType,
  COMPARTMENT_PRESETS,
  COMPARTMENT_TYPE_LABELS,
  COMPARTMENT_TYPE_COLORS,
} from '@/types'
import { CompartmentType } from '@/types'
import type { CompartmentPreset } from '@/types'
import {
  DOOR_SECTIONS,
  SIMPLE_GRID_CLASS,
  getCompartmentPositionClass,
  getEmptySlots,
  getExtraCompartments,
  getExtraColumnClass,
  encodeExtraPosition,
  decodeExtraColumn,
  EXTRA_BASE_OFFSET,
} from '@/utils/fridgeLayout'
import {
  EditableCompartmentCell,
  GROUP_OPTIONS,
} from './EditableCompartmentCell'
import styles from './CompartmentEditor.module.scss'

const cx = classNames.bind(styles)

interface CompartmentEditorProps {
  compartments: CompartmentPreset[]
  onChange: (compartments: CompartmentPreset[]) => void
  fridgeType?: FridgeType
}

export const CompartmentEditor = ({
  compartments,
  onChange,
  fridgeType,
}: CompartmentEditorProps) => {
  const effectiveFridgeType = fridgeType ?? FridgeType.TWO_DOOR
  const isDoorType = DOOR_SECTIONS[effectiveFridgeType] !== undefined
  const [showAddExtra, setShowAddExtra] = useState(false)

  const compartmentMap = useMemo(
    () => new Map(compartments.map((c) => [c.position, c])),
    [compartments],
  )

  const emptySlots = useMemo(
    () => getEmptySlots(effectiveFridgeType, compartments),
    [effectiveFridgeType, compartments],
  )

  const emptySlotMap = useMemo(
    () => new Map(emptySlots.map((s) => [s.position, s])),
    [emptySlots],
  )

  const extraCompartments = useMemo(
    () => getExtraCompartments(effectiveFridgeType, compartments),
    [effectiveFridgeType, compartments],
  )

  useEffect(() => {
    if (!showAddExtra) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddExtra(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showAddExtra])

  const EXTRA_LABEL_PREFIX: Record<string, string> = {
    [CompartmentType.FRIDGE_UPPER]: '냉장',
    [CompartmentType.DOOR]: '문 수납',
    [CompartmentType.FREEZER]: '냉동',
    [CompartmentType.FRIDGE_LOWER]: '냉장 하단',
    [CompartmentType.DRAWER]: '서랍',
    [CompartmentType.VEGGIE]: '채소칸',
  }

  const handleDelete = useCallback(
    (position: number) => {
      if (compartments.length <= 1) return
      const deleted = compartments.find((c) => c.position === position)
      if (!deleted) return
      const filtered = compartments.filter((c) => c.position !== position)

      // SBS DOOR: 섹션별로 분리 재번호 (position 기반)
      if (
        effectiveFridgeType === FridgeType.SIDE_BY_SIDE &&
        deleted.type === CompartmentType.DOOR
      ) {
        const deletedIsFreezer =
          (deleted.position >= 15 && deleted.position <= 19) ||
          (deleted.position >= EXTRA_BASE_OFFSET &&
            decodeExtraColumn(deleted.position) === 2)
        const sameGroup = filtered
          .filter((c) => {
            if (c.type !== CompartmentType.DOOR) return false
            const isFreezer =
              (c.position >= 15 && c.position <= 19) ||
              (c.position >= EXTRA_BASE_OFFSET &&
                decodeExtraColumn(c.position) === 2)
            return isFreezer === deletedIsFreezer
          })
          .sort((a, b) => a.position - b.position)
        const renumberMap = new Map(
          sameGroup.map((c, i) => [c.position, `문 수납 ${i + 1}`]),
        )
        const updated = filtered.map((c) => {
          const newLabel = renumberMap.get(c.position)
          return newLabel !== undefined ? { ...c, label: newLabel } : c
        })
        onChange(updated)
        return
      }

      // 같은 타입의 칸들을 position 순으로 재번호 매기기
      const prefix =
        EXTRA_LABEL_PREFIX[deleted.type] ??
        COMPARTMENT_TYPE_LABELS[deleted.type]
      const sameTypeSorted = filtered
        .filter((c) => c.type === deleted.type)
        .sort((a, b) => a.position - b.position)
      const renumberMap = new Map(
        sameTypeSorted.map((c, i) => [c.position, `${prefix} ${i + 1}`]),
      )
      const updated = filtered.map((c) => {
        const newLabel = renumberMap.get(c.position)
        return newLabel !== undefined ? { ...c, label: newLabel } : c
      })
      onChange(updated)
    },
    [compartments, onChange, effectiveFridgeType],
  )

  const handleAdd = useCallback(
    (preset: CompartmentPreset) => {
      const updated = [...compartments, preset].sort(
        (a, b) => a.position - b.position,
      )
      onChange(updated)
    },
    [compartments, onChange],
  )

  const handleLabelChange = useCallback(
    (position: number, label: string) => {
      const updated = compartments.map((c) =>
        c.position === position ? { ...c, label } : c,
      )
      onChange(updated)
    },
    [compartments, onChange],
  )

  const maxCompartments =
    effectiveFridgeType === FridgeType.SIDE_BY_SIDE ? 24 : 15

  const handleAddExtra = useCallback(
    (type: CompartmentType, column?: 1 | 2) => {
      if (compartments.length >= maxCompartments) return
      const position = column
        ? encodeExtraPosition(compartments, column)
        : encodeExtraPosition(compartments, 1)

      let prefix: string
      let sameCount: number

      if (
        effectiveFridgeType === FridgeType.SIDE_BY_SIDE &&
        type === CompartmentType.DOOR
      ) {
        // SBS: 문 수납은 섹션별로 분리 (position 기반)
        prefix = '문 수납'
        sameCount = compartments.filter((c) => {
          if (c.type !== CompartmentType.DOOR) return false
          const isFreezer =
            (c.position >= 15 && c.position <= 19) ||
            (c.position >= EXTRA_BASE_OFFSET &&
              decodeExtraColumn(c.position) === 2)
          return column === 2 ? isFreezer : !isFreezer
        }).length
      } else {
        prefix = EXTRA_LABEL_PREFIX[type] ?? COMPARTMENT_TYPE_LABELS[type]
        sameCount = compartments.filter((c) => c.type === type).length
      }

      const label = `${prefix} ${sameCount + 1}`
      const preset: CompartmentPreset = {
        type,
        label,
        position,
        column,
      }
      onChange([...compartments, preset])
      setShowAddExtra(false)
    },
    [compartments, onChange, effectiveFridgeType, maxCompartments],
  )

  // 프리셋의 모든 position에 대해 셀 렌더링 (기존 칸 or 빈 슬롯)
  const renderCell = (position: number, className?: string) => {
    const existing = compartmentMap.get(position)
    const empty = emptySlotMap.get(position)

    if (existing) {
      return (
        <EditableCompartmentCell
          key={`pos-${position}`}
          preset={existing}
          fridgeType={effectiveFridgeType}
          onDelete={() => handleDelete(position)}
          onLabelChange={(label) => handleLabelChange(position, label)}
          canDelete={false}
          className={className}
        />
      )
    }

    if (empty) {
      return (
        <EditableCompartmentCell
          key={`pos-${position}`}
          preset={empty}
          fridgeType={effectiveFridgeType}
          isEmpty
          onAdd={(type: CompartmentType) =>
            handleAdd({ ...empty, type, label: COMPARTMENT_TYPE_LABELS[type] })
          }
          className={className}
        />
      )
    }

    return null
  }

  // === Simple Grid 레이아웃 (ONE_DOOR, TWO_DOOR) ===
  const renderSimpleGrid = () => {
    // ONE_DOOR: flex 2열 레이아웃 (도어 추가 시 높이 자동 맞춤)
    if (effectiveFridgeType === FridgeType.ONE_DOOR) {
      const presets = COMPARTMENT_PRESETS[effectiveFridgeType]
      const bodyPresets = presets.filter((p) => p.type !== CompartmentType.DOOR)
      const doorPresets = presets.filter((p) => p.type === CompartmentType.DOOR)
      const bodyExtras = extraCompartments.filter(
        (c) => c.type !== CompartmentType.DOOR,
      )
      const doorExtras = extraCompartments.filter(
        (c) => c.type === CompartmentType.DOOR,
      )

      return (
        <div className={cx('fridgeBody')}>
          <div className={cx('twoColumnLayout', 'twoColumnWideLeft')}>
            <div className={cx('fridgeColumn')}>
              {bodyPresets.map((p) => renderCell(p.position))}
              {bodyExtras.map((comp) => (
                <EditableCompartmentCell
                  key={`extra-${comp.position}`}
                  preset={comp}
                  fridgeType={effectiveFridgeType}
                  onDelete={() => handleDelete(comp.position)}
                  onLabelChange={(label) =>
                    handleLabelChange(comp.position, label)
                  }
                  canDelete={compartments.length > 1}
                />
              ))}
            </div>
            <div className={cx('fridgeColumn')}>
              {doorPresets.map((p) => renderCell(p.position))}
              {doorExtras.map((comp) => (
                <EditableCompartmentCell
                  key={`extra-${comp.position}`}
                  preset={comp}
                  fridgeType={effectiveFridgeType}
                  onDelete={() => handleDelete(comp.position)}
                  onLabelChange={(label) =>
                    handleLabelChange(comp.position, label)
                  }
                  canDelete={compartments.length > 1}
                />
              ))}
            </div>
          </div>
        </div>
      )
    }

    // 기존 CSS Grid fallback
    const gridClass = SIMPLE_GRID_CLASS[effectiveFridgeType]
    const presets = COMPARTMENT_PRESETS[effectiveFridgeType]

    return (
      <div className={cx('fridgeBody')}>
        <div className={cx(gridClass)}>
          {presets.map((preset) =>
            renderCell(
              preset.position,
              cx(
                getCompartmentPositionClass(
                  effectiveFridgeType,
                  preset.position,
                ),
              ),
            ),
          )}
          {extraCompartments.map((comp) => (
            <EditableCompartmentCell
              key={`extra-${comp.position}`}
              preset={comp}
              fridgeType={effectiveFridgeType}
              onDelete={() => handleDelete(comp.position)}
              onLabelChange={(label) => handleLabelChange(comp.position, label)}
              canDelete={compartments.length > 1}
              className={cx(
                getExtraColumnClass(comp.position) ?? 'extraInGrid',
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  // === Door Section 레이아웃 (SIDE_BY_SIDE, FOUR_DOOR) ===
  const renderDoorSections = () => {
    const sections = DOOR_SECTIONS[effectiveFridgeType]
    if (!sections) return null
    const presets = COMPARTMENT_PRESETS[effectiveFridgeType]
    // SBS: 에디터에서는 냉장실을 위에 표시 (DOOR_SECTIONS는 닫힌뷰 좌우 배치용으로 냉동실이 먼저)
    const orderedSections =
      effectiveFridgeType === FridgeType.SIDE_BY_SIDE
        ? [...sections].reverse()
        : sections

    return (
      <div className={cx('doorSectionsContainer')}>
        {orderedSections.map((section) => {
          // 이 섹션에 속하는 프리셋 position들
          const sectionPositions = section.positions.filter((pos) =>
            presets.some((p) => p.position === pos),
          )

          // TWO_DOOR/SBS: 추가 칸을 해당 섹션에 배치
          const sectionExtras =
            effectiveFridgeType === FridgeType.TWO_DOOR ||
            effectiveFridgeType === FridgeType.SIDE_BY_SIDE
              ? extraCompartments.filter((comp) => {
                  if (effectiveFridgeType === FridgeType.TWO_DOOR) {
                    return section.isFreezer
                      ? comp.type === CompartmentType.FREEZER
                      : comp.type !== CompartmentType.FREEZER
                  }
                  // SBS: column 기반 섹션 배분
                  return section.isFreezer
                    ? decodeExtraColumn(comp.position) === 2
                    : decodeExtraColumn(comp.position) === 1
                })
              : []

          const renderExtraCell = (comp: CompartmentPreset) => (
            <EditableCompartmentCell
              key={`extra-${comp.position}`}
              preset={comp}
              fridgeType={effectiveFridgeType}
              onDelete={() => handleDelete(comp.position)}
              onLabelChange={(label) => handleLabelChange(comp.position, label)}
              canDelete={compartments.length > 1}
            />
          )

          const renderSectionContent = () => {
            if (sectionPositions.length === 1 && sectionExtras.length === 0) {
              return renderCell(sectionPositions[0]!)
            }

            if (section.layout === 'column') {
              return (
                <div className={cx('fridgeColumn')}>
                  {sectionPositions.map((pos) => renderCell(pos))}
                  {sectionExtras.map(renderExtraCell)}
                </div>
              )
            }

            if (section.layout === 'twoColumn') {
              const leftPositions = sectionPositions.slice(
                0,
                section.columnSplit!,
              )
              const rightPositions = sectionPositions.slice(
                section.columnSplit!,
              )
              const leftExtras = section.reverseColumns
                ? sectionExtras.filter((c) => c.type === CompartmentType.DOOR)
                : sectionExtras.filter((c) => c.type !== CompartmentType.DOOR)
              const rightExtras = section.reverseColumns
                ? sectionExtras.filter((c) => c.type !== CompartmentType.DOOR)
                : sectionExtras.filter((c) => c.type === CompartmentType.DOOR)
              return (
                <div
                  className={cx('twoColumnLayout', {
                    twoColumnWideLeft:
                      effectiveFridgeType === FridgeType.TWO_DOOR,
                  })}
                >
                  <div className={cx('fridgeColumn')}>
                    {leftPositions.map((pos) => renderCell(pos))}
                    {leftExtras.map(renderExtraCell)}
                  </div>
                  <div className={cx('fridgeColumn')}>
                    {rightPositions.map((pos) => renderCell(pos))}
                    {rightExtras.map(renderExtraCell)}
                  </div>
                </div>
              )
            }

            // grid3x2 or grid2x1
            return (
              <div
                className={cx(
                  section.layout === 'grid3x2'
                    ? 'gridLayout3x2'
                    : 'gridLayout2x1',
                )}
              >
                {sectionPositions.map((pos) => renderCell(pos))}
              </div>
            )
          }

          return (
            <div
              key={section.label}
              className={cx('doorSection', {
                doorSectionFull: section.spanFull,
              })}
            >
              <div className={cx('doorSectionLabel')}>{section.label}</div>
              <div className={cx('doorSectionContent')}>
                {renderSectionContent()}
              </div>
            </div>
          )
        })}
        {effectiveFridgeType !== FridgeType.TWO_DOOR &&
          effectiveFridgeType !== FridgeType.SIDE_BY_SIDE &&
          extraCompartments.length > 0 && (
            <div className={cx('doorSection')}>
              <div className={cx('doorSectionLabel')}>추가 칸</div>
              <div className={cx('doorSectionContent')}>
                <div className={cx('fridgeColumn')}>
                  {extraCompartments.map((comp) => (
                    <EditableCompartmentCell
                      key={`extra-${comp.position}`}
                      preset={comp}
                      fridgeType={effectiveFridgeType}
                      onDelete={() => handleDelete(comp.position)}
                      onLabelChange={(label) =>
                        handleLabelChange(comp.position, label)
                      }
                      canDelete={compartments.length > 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>
    )
  }

  // === 추가 칸 버튼 ===
  const renderAddExtraButton = () => {
    if (compartments.length >= maxCompartments) return null

    return (
      <div className={cx('addExtraSection')}>
        <div className={cx('addExtraWrapper')}>
          <button
            type="button"
            className={cx('addExtraBtn')}
            onClick={() => setShowAddExtra(true)}
            aria-expanded={showAddExtra}
            aria-haspopup="dialog"
          >
            + 칸 추가
          </button>
          {showAddExtra && (
            <>
              <div
                className={cx('addExtraBackdrop')}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAddExtra(false)
                }}
              />
              <div
                className={cx('addExtraPopover')}
                onClick={(e) => e.stopPropagation()}
              >
                {effectiveFridgeType === FridgeType.SIDE_BY_SIDE ? (
                  <>
                    <div className={cx('addExtraSectionHeader')}>냉장실</div>
                    <button
                      type="button"
                      className={cx('addExtraOption')}
                      style={{
                        borderLeftColor:
                          COMPARTMENT_TYPE_COLORS[CompartmentType.FRIDGE_UPPER],
                      }}
                      onClick={() =>
                        handleAddExtra(CompartmentType.FRIDGE_UPPER, 1)
                      }
                    >
                      {COMPARTMENT_TYPE_LABELS[CompartmentType.FRIDGE_UPPER]}
                    </button>
                    <button
                      type="button"
                      className={cx('addExtraOption')}
                      style={{
                        borderLeftColor:
                          COMPARTMENT_TYPE_COLORS[CompartmentType.DOOR],
                      }}
                      onClick={() => handleAddExtra(CompartmentType.DOOR, 1)}
                    >
                      {COMPARTMENT_TYPE_LABELS[CompartmentType.DOOR]}
                    </button>
                    <div className={cx('addExtraSectionHeader')}>냉동실</div>
                    <button
                      type="button"
                      className={cx('addExtraOption')}
                      style={{
                        borderLeftColor:
                          COMPARTMENT_TYPE_COLORS[CompartmentType.FREEZER],
                      }}
                      onClick={() => handleAddExtra(CompartmentType.FREEZER, 2)}
                    >
                      {COMPARTMENT_TYPE_LABELS[CompartmentType.FREEZER]}
                    </button>
                    <button
                      type="button"
                      className={cx('addExtraOption')}
                      style={{
                        borderLeftColor:
                          COMPARTMENT_TYPE_COLORS[CompartmentType.DOOR],
                      }}
                      onClick={() => handleAddExtra(CompartmentType.DOOR, 2)}
                    >
                      {COMPARTMENT_TYPE_LABELS[CompartmentType.DOOR]}
                    </button>
                  </>
                ) : isDoorType ? (
                  (effectiveFridgeType === FridgeType.TWO_DOOR
                    ? [
                        CompartmentType.FRIDGE_UPPER,
                        CompartmentType.DOOR,
                        CompartmentType.FREEZER,
                      ]
                    : GROUP_OPTIONS
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={cx('addExtraOption')}
                      style={{ borderLeftColor: COMPARTMENT_TYPE_COLORS[type] }}
                      onClick={() => handleAddExtra(type)}
                    >
                      {COMPARTMENT_TYPE_LABELS[type]}
                    </button>
                  ))
                ) : (
                  [CompartmentType.FRIDGE_UPPER, CompartmentType.DOOR].map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        className={cx('addExtraOption')}
                        style={{
                          borderLeftColor: COMPARTMENT_TYPE_COLORS[type],
                        }}
                        onClick={() =>
                          handleAddExtra(
                            type,
                            type === CompartmentType.DOOR ? 2 : 1,
                          )
                        }
                      >
                        {COMPARTMENT_TYPE_LABELS[type]}
                      </button>
                    ),
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cx('editor')}>
      <div className={cx('header')}>
        <h3 className={cx('headerTitle')}>칸 구성</h3>
        <span className={cx('headerCount')}>{compartments.length}칸</span>
      </div>

      <div className={cx('fridge')}>
        {isDoorType ? renderDoorSections() : renderSimpleGrid()}
        {renderAddExtraButton()}
      </div>
    </div>
  )
}
