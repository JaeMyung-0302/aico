import { useState } from 'react'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { formatStartedOnInput, isValidStartedOn } from '@/modules/couple/util-pairing/started-on-input'
import { useNow } from '@/shared/hooks/use-now'

type DiaryDateSheetProps = {
  isVisible: boolean
  value: string
  onClose: () => void
  onConfirm: (isoDate: string) => void
}

// 날짜 선택기 없이 숫자로 입력한다(사귄 날 입력과 같은 규칙: 오늘 KST 이후는 안 된다)
const DiaryDateSheet = ({ isVisible, value, onClose, onConfirm }: DiaryDateSheetProps) => {
  const [draft, setDraft] = useState(value)
  const isValid = isValidStartedOn(draft, useNow(60_000))
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <TextField
        label="날짜"
        value={draft}
        onChangeText={(text) => setDraft(formatStartedOnInput(text))}
        keyboardType="number-pad"
        placeholder="YYYY-MM-DD"
        errorMessage={draft.length === 10 && !isValid ? '오늘까지의 날짜를 입력해 주세요' : null}
      />
      <Button label="확인" disabled={!isValid} onPress={() => onConfirm(draft)} />
    </BottomSheet>
  )
}

export default DiaryDateSheet
