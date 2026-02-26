import { useState, useCallback, useMemo } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FridgeType, FRIDGE_TYPE_LABELS, FRIDGE_TYPE_DESCRIPTIONS, COMPARTMENT_PRESETS } from '@/types'
import type { CompartmentPreset } from '@/types'
import { FridgeTypeIcon } from '@/components/FridgeTypeIcon'
import { CompartmentEditor } from '@/components/CompartmentEditor'
import styles from './SetupPage.module.scss'

const cx = classNames.bind(styles)

const FRIDGE_TYPES = Object.values(FridgeType) as FridgeType[]

type Step = 'type' | 'compartments' | 'name'

export const SetupPage = () => {
  const navigate = useNavigate()
  const { createFridge, loading, error } = useFridgeStore()

  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<FridgeType | null>(null)
  const [compartments, setCompartments] = useState<CompartmentPreset[]>([])
  const [name, setName] = useState('')

  const handleSelectType = useCallback((type: FridgeType) => {
    setSelectedType(type)
    setCompartments([...COMPARTMENT_PRESETS[type]])
    setStep('compartments')
  }, [])

  const handleSkipCompartments = useCallback(() => {
    setStep('name')
  }, [])

  const handleConfirmCompartments = useCallback(() => {
    setStep('name')
  }, [])

  // 프리셋과 동일한지 확인 — 동일하면 서버에 compartments 안 보냄
  const isPresetUnchanged = useMemo(() => {
    if (!selectedType) return true
    const presets = COMPARTMENT_PRESETS[selectedType]
    if (compartments.length !== presets.length) return false
    return compartments.every(
      (c, i) => c.type === presets[i]!.type && c.label === presets[i]!.label,
    )
  }, [selectedType, compartments])

  const isValid = selectedType !== null && name.trim().length > 0

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isValid || !selectedType || loading) return

      const input = isPresetUnchanged
        ? { type: selectedType, name: name.trim() }
        : { type: selectedType, name: name.trim(), compartments }

      const fridge = await createFridge(input)
      if (fridge) {
        navigate('/select', { replace: true })
      }
    },
    [isValid, selectedType, name, loading, createFridge, navigate, isPresetUnchanged, compartments],
  )

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>냉장고 추가</h1>

      {step === 'type' && (
        <>
          <p className={cx('subtitle')}>냉장고 타입을 선택해주세요</p>
          <div className={cx('typeGrid')}>
            {FRIDGE_TYPES.map((type) => (
              <button
                key={type}
                className={cx('typeCard', { typeCardSelected: selectedType === type })}
                onClick={() => handleSelectType(type)}
                type="button"
              >
                <span className={cx('typeIcon')}><FridgeTypeIcon type={type} size={40} /></span>
                <span className={cx('typeName')}>{FRIDGE_TYPE_LABELS[type]}</span>
                <span className={cx('typeDesc')}>{FRIDGE_TYPE_DESCRIPTIONS[type]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'compartments' && selectedType && (
        <>
          <p className={cx('subtitle')}>
            칸 구성을 확인하고 필요하면 수정해주세요
          </p>

          <CompartmentEditor compartments={compartments} onChange={setCompartments} fridgeType={selectedType} />

          <div className={cx('stepActions')}>
            <button
              className={cx('backBtn')}
              onClick={() => setStep('type')}
              type="button"
            >
              이전
            </button>
            <button
              className={cx('skipBtn')}
              onClick={handleSkipCompartments}
              type="button"
            >
              건너뛰기
            </button>
            <button
              className={cx('nextBtn')}
              onClick={handleConfirmCompartments}
              type="button"
            >
              확인
            </button>
          </div>
        </>
      )}

      {step === 'name' && (
        <form onSubmit={handleSubmit}>
          <p className={cx('subtitle')}>냉장고 이름을 지어주세요</p>

          <div className={cx('field')}>
            <label className={cx('label')}>냉장고 이름</label>
            <input
              className={cx('input')}
              type="text"
              placeholder="예: 주방 냉장고, 안방 미니냉장고"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>

          <div className={cx('stepActions')}>
            <button
              className={cx('backBtn')}
              onClick={() => setStep('compartments')}
              type="button"
            >
              이전
            </button>
            <button
              className={cx('submitBtn')}
              type="submit"
              disabled={!isValid || loading}
            >
              {loading ? '추가 중...' : '냉장고 추가하기'}
            </button>
          </div>
        </form>
      )}

      {error && <p className={cx('error')}>{error}</p>}
    </div>
  )
}
