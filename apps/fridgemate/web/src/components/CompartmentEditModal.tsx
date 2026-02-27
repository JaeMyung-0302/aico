import { useState, useCallback } from 'react'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { COMPARTMENT_PRESETS } from '@/types'
import type { FridgeResponse, CompartmentPreset } from '@/types'
import { isEncodedExtraPosition, decodeExtraColumn } from '@/utils/fridgeLayout'
import { CompartmentEditor } from './CompartmentEditor'
import styles from './CompartmentEditModal.module.scss'

const cx = classNames.bind(styles)

interface CompartmentEditModalProps {
  fridge: FridgeResponse
  onClose: () => void
}

export const CompartmentEditModal = ({
  fridge,
  onClose,
}: CompartmentEditModalProps) => {
  const { updateCompartments } = useFridgeStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기존 칸 데이터를 CompartmentPreset 형태로 변환
  const initialCompartments: CompartmentPreset[] = fridge.compartments.map(
    (c) => ({
      type: c.type,
      label: c.label,
      position: c.position,
      column: isEncodedExtraPosition(c.position)
        ? decodeExtraColumn(c.position)
        : undefined,
    }),
  )

  const [compartments, setCompartments] =
    useState<CompartmentPreset[]>(initialCompartments)

  // 식재료가 있는 칸이 있는지 확인
  const hasOccupiedCompartments = fridge.compartments.some(
    (c) => c.itemCount > 0,
  )

  const handleReset = useCallback(() => {
    const presets = COMPARTMENT_PRESETS[fridge.type]
    setCompartments([...presets])
  }, [fridge.type])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)

    const result = await updateCompartments(fridge.id, { compartments })
    if (result) {
      onClose()
    } else {
      setError('칸 구성 저장에 실패했습니다')
    }
    setSaving(false)
  }, [saving, fridge.id, compartments, updateCompartments, onClose])

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <h3 className={cx('title')}>칸 구성 편집</h3>
        <p className={cx('subtitle')}>{fridge.name}</p>

        {hasOccupiedCompartments && (
          <p className={cx('warning')}>
            식재료가 있는 칸이 있습니다. 모든 식재료를 이동한 후 편집해주세요.
          </p>
        )}

        <CompartmentEditor
          compartments={compartments}
          onChange={setCompartments}
          fridgeType={fridge.type}
        />

        <button className={cx('resetBtn')} onClick={handleReset} type="button">
          기본값으로 초기화
        </button>

        {error && <p className={cx('error')}>{error}</p>}

        <div className={cx('actions')}>
          <button className={cx('cancelBtn')} onClick={onClose} type="button">
            취소
          </button>
          <button
            className={cx('saveBtn')}
            onClick={handleSave}
            disabled={saving || hasOccupiedCompartments}
            type="button"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
