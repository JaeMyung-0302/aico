import { useState } from 'react'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { formatStartedOnInput, isValidStartedOn } from '@/modules/couple/util-pairing/started-on-input'
import type { DateRange } from '@/modules/media/util-pick-assets/list-assets-by-date-range'
import { useNow } from '@/shared/hooks/use-now'
import { kstDayEndMs, kstDayStartMs } from './range-options'

type CustomRangeSheetProps = {
  isVisible: boolean
  onClose: () => void
  onConfirm: (range: DateRange) => void
}

// 기간 직접 고르기: 시작일·종료일(KST, 오늘까지) 숫자 입력
const CustomRangeSheet = ({ isVisible, onClose, onConfirm }: CustomRangeSheetProps) => {
  const nowMs = useNow(60_000)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const isValid = isValidStartedOn(from, nowMs) && isValidStartedOn(to, nowMs) && from <= to
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <TextField
        label="시작일"
        value={from}
        onChangeText={(text) => setFrom(formatStartedOnInput(text))}
        keyboardType="number-pad"
        placeholder="YYYY-MM-DD"
      />
      <TextField
        label="종료일"
        value={to}
        onChangeText={(text) => setTo(formatStartedOnInput(text))}
        keyboardType="number-pad"
        placeholder="YYYY-MM-DD"
        errorMessage={from.length === 10 && to.length === 10 && !isValid ? '오늘까지, 시작일 이후로 입력해 주세요' : null}
      />
      <Button
        label="이 기간으로"
        disabled={!isValid}
        onPress={() => onConfirm({ fromMs: kstDayStartMs(from), toMs: Math.min(kstDayEndMs(to), nowMs) })}
      />
    </BottomSheet>
  )
}

export default CustomRangeSheet
