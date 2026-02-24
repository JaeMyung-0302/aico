import { useState, useCallback } from 'react'
import classNames from 'classnames/bind'
import {
  CompartmentType,
  COMPARTMENT_TYPE_LABELS,
} from '@/types'
import type { CompartmentPreset } from '@/types'
import styles from './CompartmentEditor.module.scss'

const cx = classNames.bind(styles)

interface CompartmentEditorProps {
  compartments: CompartmentPreset[]
  onChange: (compartments: CompartmentPreset[]) => void
}

const COMPARTMENT_TYPE_OPTIONS = Object.values(CompartmentType).map((value) => ({
  value,
  label: COMPARTMENT_TYPE_LABELS[value],
}))

export const CompartmentEditor = ({ compartments, onChange }: CompartmentEditorProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const handleDelete = useCallback(
    (index: number) => {
      if (compartments.length <= 1) return
      const updated = compartments
        .filter((_, i) => i !== index)
        .map((c, i) => ({ ...c, position: i }))
      onChange(updated)
    },
    [compartments, onChange],
  )

  const handleAdd = useCallback(
    (type: string) => {
      const label = COMPARTMENT_TYPE_LABELS[type as CompartmentType] ?? '새 칸'
      const next: CompartmentPreset = {
        type: type as CompartmentType,
        label,
        position: compartments.length,
      }
      onChange([...compartments, next])
    },
    [compartments, onChange],
  )

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const updated = compartments.map((c, i) => {
        if (i === index - 1) return { ...compartments[index]!, position: index - 1 }
        if (i === index) return { ...compartments[index - 1]!, position: index }
        return c
      })
      onChange(updated)
    },
    [compartments, onChange],
  )

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= compartments.length - 1) return
      const updated = compartments.map((c, i) => {
        if (i === index) return { ...compartments[index + 1]!, position: index }
        if (i === index + 1) return { ...compartments[index]!, position: index + 1 }
        return c
      })
      onChange(updated)
    },
    [compartments, onChange],
  )

  const handleStartEdit = useCallback(
    (index: number) => {
      setEditingIndex(index)
      setEditLabel(compartments[index]!.label)
    },
    [compartments],
  )

  const handleSaveEdit = useCallback(() => {
    if (editingIndex === null || !editLabel.trim()) return
    const updated = compartments.map((c, i) =>
      i === editingIndex ? { ...c, label: editLabel.trim() } : c,
    )
    onChange(updated)
    setEditingIndex(null)
  }, [editingIndex, editLabel, compartments, onChange])

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null)
  }, [])

  return (
    <div className={cx('editor')}>
      <div className={cx('header')}>
        <h3 className={cx('headerTitle')}>칸 구성</h3>
        <span className={cx('headerCount')}>{compartments.length}칸</span>
      </div>

      <ul className={cx('list')}>
        {compartments.map((c, index) => (
          <li key={`${c.type}-${c.label}-${index}`} className={cx('item')}>
            {editingIndex === index ? (
              <div className={cx('editRow')}>
                <input
                  className={cx('editInput')}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  maxLength={20}
                  autoFocus
                />
                <button className={cx('editBtn')} onClick={handleSaveEdit} type="button">
                  확인
                </button>
                <button className={cx('editBtn', 'editBtnCancel')} onClick={handleCancelEdit} type="button">
                  취소
                </button>
              </div>
            ) : (
              <div className={cx('itemRow')}>
                <span className={cx('itemType')}>
                  {COMPARTMENT_TYPE_LABELS[c.type as CompartmentType]}
                </span>
                <span className={cx('itemLabel')} onClick={() => handleStartEdit(index)}>
                  {c.label}
                </span>
                <div className={cx('itemActions')}>
                  <button
                    className={cx('moveBtn')}
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    type="button"
                    aria-label="위로 이동"
                  >
                    ↑
                  </button>
                  <button
                    className={cx('moveBtn')}
                    onClick={() => handleMoveDown(index)}
                    disabled={index === compartments.length - 1}
                    type="button"
                    aria-label="아래로 이동"
                  >
                    ↓
                  </button>
                  <button
                    className={cx('deleteBtn')}
                    onClick={() => handleDelete(index)}
                    disabled={compartments.length <= 1}
                    type="button"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className={cx('addSection')}>
        <span className={cx('addLabel')}>칸 추가:</span>
        <div className={cx('addButtons')}>
          {COMPARTMENT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={cx('addBtn')}
              onClick={() => handleAdd(opt.value)}
              type="button"
            >
              + {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
