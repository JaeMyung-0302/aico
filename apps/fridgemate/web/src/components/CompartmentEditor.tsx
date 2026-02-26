import { useCallback, useMemo } from 'react'
import classNames from 'classnames/bind'
import { FridgeType, COMPARTMENT_PRESETS } from '@/types'
import type { CompartmentPreset } from '@/types'
import {
  DOOR_SECTIONS,
  SIMPLE_GRID_CLASS,
  getCompartmentPositionClass,
  getEmptySlots,
} from '@/utils/fridgeLayout'
import { EditableCompartmentCell } from './EditableCompartmentCell'
import styles from './CompartmentEditor.module.scss'

const cx = classNames.bind(styles)

interface CompartmentEditorProps {
  compartments: CompartmentPreset[]
  onChange: (compartments: CompartmentPreset[]) => void
  fridgeType?: FridgeType
}

export const CompartmentEditor = ({ compartments, onChange, fridgeType }: CompartmentEditorProps) => {
  const effectiveFridgeType = fridgeType ?? FridgeType.TWO_DOOR

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

  const handleDelete = useCallback(
    (position: number) => {
      if (compartments.length <= 1) return
      const updated = compartments.filter((c) => c.position !== position)
      onChange(updated)
    },
    [compartments, onChange],
  )

  const handleAdd = useCallback(
    (preset: CompartmentPreset) => {
      const updated = [...compartments, preset].sort((a, b) => a.position - b.position)
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
          canDelete={compartments.length > 1}
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
          onAdd={() => handleAdd(empty)}
          className={className}
        />
      )
    }

    return null
  }

  // === Simple Grid 레이아웃 (ONE_DOOR, TWO_DOOR, MINI) ===
  const renderSimpleGrid = () => {
    const gridClass = SIMPLE_GRID_CLASS[effectiveFridgeType]
    const presets = COMPARTMENT_PRESETS[effectiveFridgeType]

    return (
      <div className={cx('fridgeBody')}>
        <div className={cx(gridClass)}>
          {presets.map((preset) =>
            renderCell(
              preset.position,
              cx(getCompartmentPositionClass(effectiveFridgeType, preset.position)),
            ),
          )}
        </div>
      </div>
    )
  }

  // === Door Section 레이아웃 (SIDE_BY_SIDE, FOUR_DOOR) ===
  const renderDoorSections = () => {
    const sections = DOOR_SECTIONS[effectiveFridgeType]
    if (!sections) return null
    const presets = COMPARTMENT_PRESETS[effectiveFridgeType]

    return (
      <div className={cx('doorSectionsContainer')}>
        {sections.map((section) => {
          // 이 섹션에 속하는 프리셋 position들
          const sectionPositions = section.positions.filter((pos) =>
            presets.some((p) => p.position === pos),
          )

          const renderSectionContent = () => {
            if (sectionPositions.length === 1) {
              return renderCell(sectionPositions[0]!)
            }

            if (section.layout === 'column') {
              return (
                <div className={cx('fridgeColumn')}>
                  {sectionPositions.map((pos) => renderCell(pos))}
                </div>
              )
            }

            if (section.layout === 'twoColumn') {
              const leftPositions = sectionPositions.slice(0, section.columnSplit!)
              const rightPositions = sectionPositions.slice(section.columnSplit!)
              return (
                <div className={cx('twoColumnLayout')}>
                  <div className={cx('fridgeColumn')}>
                    {leftPositions.map((pos) => renderCell(pos))}
                  </div>
                  <div className={cx('fridgeColumn')}>
                    {rightPositions.map((pos) => renderCell(pos))}
                  </div>
                </div>
              )
            }

            // grid3x2 or grid2x1
            return (
              <div className={cx(section.layout === 'grid3x2' ? 'gridLayout3x2' : 'gridLayout2x1')}>
                {sectionPositions.map((pos) => renderCell(pos))}
              </div>
            )
          }

          return (
            <div
              key={section.label}
              className={cx('doorSection', { doorSectionFull: section.spanFull })}
            >
              <div className={cx('doorSectionLabel')}>{section.label}</div>
              <div className={cx('doorSectionContent')}>
                {renderSectionContent()}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const isDoorType = DOOR_SECTIONS[effectiveFridgeType] !== undefined

  return (
    <div className={cx('editor')}>
      <div className={cx('header')}>
        <h3 className={cx('headerTitle')}>칸 구성</h3>
        <span className={cx('headerCount')}>{compartments.length}칸</span>
      </div>

      <div className={cx('fridge')}>
        {isDoorType ? renderDoorSections() : renderSimpleGrid()}
      </div>
    </div>
  )
}
