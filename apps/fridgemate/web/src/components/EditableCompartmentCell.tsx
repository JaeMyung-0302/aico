import { useState, useCallback, useRef, useEffect } from 'react'
import classNames from 'classnames/bind'
import { COMPARTMENT_TYPE_COLORS, COMPARTMENT_TYPE_LABELS } from '@/types'
import type { CompartmentPreset, FridgeType } from '@/types'
import { isFreezerZone, isDrawerPosition, isShowcasePosition } from '@/utils/fridgeLayout'
import styles from './EditableCompartmentCell.module.scss'

const cx = classNames.bind(styles)

interface EditableCompartmentCellProps {
  preset: CompartmentPreset
  fridgeType: FridgeType
  isEmpty?: boolean
  onDelete?: () => void
  onAdd?: () => void
  onLabelChange?: (label: string) => void
  canDelete?: boolean
  className?: string
}

export const EditableCompartmentCell = ({
  preset,
  fridgeType,
  isEmpty,
  onDelete,
  onAdd,
  onLabelChange,
  canDelete = true,
  className,
}: EditableCompartmentCellProps) => {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleStartEdit = useCallback(() => {
    if (isEmpty || !onLabelChange) return
    setEditValue(preset.label)
    setEditing(true)
  }, [isEmpty, onLabelChange, preset.label])

  const handleSaveEdit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && onLabelChange) {
      onLabelChange(trimmed)
    }
    setEditing(false)
  }, [editValue, onLabelChange])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [])

  const color = COMPARTMENT_TYPE_COLORS[preset.type]

  // 빈 슬롯 모드
  if (isEmpty) {
    return (
      <div
        className={cx('cell', 'cellEmpty', className, {
          cellFreezer: isFreezerZone(fridgeType, preset.position, preset.type),
          cellDrawer: isDrawerPosition(fridgeType, preset.position),
          cellShowcase: isShowcasePosition(fridgeType, preset.position),
        })}
        onClick={onAdd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onAdd?.()
          }
        }}
      >
        <span className={cx('emptyLabel')}>{preset.label}</span>
        <span className={cx('emptyPlus')}>+</span>
      </div>
    )
  }

  // 기존 칸 모드
  return (
    <div
      className={cx('cell', className, {
        cellFreezer: isFreezerZone(fridgeType, preset.position, preset.type),
        cellDrawer: isDrawerPosition(fridgeType, preset.position),
        cellShowcase: isShowcasePosition(fridgeType, preset.position),
      })}
    >
      {onDelete && (
        <button
          className={cx('deleteBtn')}
          onClick={onDelete}
          disabled={!canDelete}
          type="button"
          aria-label={`${preset.label} 삭제`}
        >
          ✕
        </button>
      )}

      <span
        className={cx('typeBadge')}
        style={{
          backgroundColor: color ? `${color}20` : undefined,
          color: color || undefined,
        }}
      >
        {COMPARTMENT_TYPE_LABELS[preset.type] ?? preset.type}
      </span>

      {editing ? (
        <input
          ref={inputRef}
          className={cx('labelInput')}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit()
            if (e.key === 'Escape') handleCancelEdit()
          }}
          onBlur={handleSaveEdit}
          maxLength={20}
        />
      ) : (
        <span
          className={cx('label')}
          onClick={handleStartEdit}
          role={onLabelChange ? 'button' : undefined}
          tabIndex={onLabelChange ? 0 : undefined}
          onKeyDown={onLabelChange ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleStartEdit()
            }
          } : undefined}
        >
          {preset.label}
        </span>
      )}
    </div>
  )
}
