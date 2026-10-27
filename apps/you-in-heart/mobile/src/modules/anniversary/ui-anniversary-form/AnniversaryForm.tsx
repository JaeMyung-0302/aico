import { anniversaryTitleSchema, isoDateSchema, trimBlankEdges } from '@you-in-heart/shared'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import TextField from '@/design-system/components/TextField'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { formatStartedOnInput } from '@/modules/couple/util-pairing/started-on-input'

const MAX_TITLE_LENGTH = 30
const ISO_DATE_LENGTH = 10

export type AnniversaryFormValue = { title: string; date: string }

type AnniversaryFormProps = {
  mode: 'create' | 'edit'
  initialValue?: AnniversaryFormValue
  isSubmitting?: boolean
  isDeleting?: boolean
  errorMessage?: string | null
  onSubmit: (value: AnniversaryFormValue) => void
  onDelete?: () => void
  onClose?: () => void
}

// SCR-04 기념일 추가·수정 시트 내용. 제목 1~30자(앞뒤 공백 제외), 날짜 필수(숫자 키패드 → YYYY-MM-DD)
// 시안의 "매년 반복"·"알림 시점"은 API 에 없다 → 커스텀은 항상 매년, 알림은 서버가 D-3·당일 09:00 에 보낸다
const AnniversaryForm = ({
  mode,
  initialValue,
  isSubmitting = false,
  isDeleting = false,
  errorMessage,
  onSubmit,
  onDelete,
  onClose,
}: AnniversaryFormProps) => {
  const [title, setTitle] = useState(initialValue?.title ?? '')
  const [date, setDate] = useState(initialValue?.date ?? '')
  const parsedTitle = anniversaryTitleSchema.safeParse(title)
  const isTitleTooLong = trimBlankEdges(title).length > MAX_TITLE_LENGTH
  const isDateValid = isoDateSchema.safeParse(date).success
  const hasDateError = date.length === ISO_DATE_LENGTH && !isDateValid
  const canSubmit = parsedTitle.success && isDateValid

  const handleSubmitPress = () => {
    if (parsedTitle.success && isDateValid) onSubmit({ title: parsedTitle.data, date })
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="heading" accessibilityRole="header">
          {mode === 'create' ? '기념일 추가' : '기념일 수정'}
        </AppText>
        {onClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="시트 닫기" onPress={onClose} style={styles.close}>
            <Icon name="close" />
          </Pressable>
        ) : null}
      </View>
      <TextField
        label="이름"
        placeholder="처음 만난 날"
        value={title}
        onChangeText={setTitle}
        errorMessage={isTitleTooLong ? `이름은 ${MAX_TITLE_LENGTH}자까지 쓸 수 있어요` : null}
      />
      <TextField
        label="날짜"
        placeholder="2025-08-23"
        keyboardType="number-pad"
        value={date}
        onChangeText={(next) => setDate(formatStartedOnInput(next))}
        errorMessage={hasDateError ? '날짜를 확인해 주세요' : null}
      />
      <AppText variant="caption" color="ink3">
        매년 같은 날짜에 챙겨드리고, 3일 전과 당일 아침에 알려드려요
      </AppText>
      {errorMessage ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {errorMessage}
        </AppText>
      ) : null}
      <Button label="저장" disabled={!canSubmit} isLoading={isSubmitting} onPress={handleSubmitPress} />
      {onDelete ? (
        <Button label="기념일 삭제" variant="text" size="md" isLoading={isDeleting} onPress={onDelete} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING[5] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
})

export default AnniversaryForm
