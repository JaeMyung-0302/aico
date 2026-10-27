import { useState } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useNow } from '@/shared/hooks/use-now'
import { expectedPurgeDate } from './unlink-dates'

const CONFIRM_PHRASE = '연결 해제'
const CONFIRM_LABEL = `확인을 위해 '${CONFIRM_PHRASE}'를 입력해 주세요`

type UnlinkConfirmModalProps = {
  isVisible: boolean
  partnerName: string
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: () => void
}

// SCR-16 연결 해제 2/2: 무엇이 일어나는지 3줄로 알리고 '연결 해제'를 직접 입력해야 버튼이 열린다
const UnlinkConfirmModal = ({
  isVisible,
  partnerName,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: UnlinkConfirmModalProps) => {
  const [typed, setTyped] = useState('')
  const now = useNow(60_000)
  const isConfirmed = typed.trim() === CONFIRM_PHRASE
  const steps = [
    `${partnerName}님에게 바로 알림이 가요.`,
    '30일 동안은 둘 다 보기와 내보내기만 할 수 있어요. 이 기간에 다시 연결할 수 있어요.',
    `${expectedPurgeDate(now)}에 사진 원본을 포함한 모든 기록이 지워지고 되돌릴 수 없어요. 백업에서는 최대 14일 뒤에 사라져요.`,
  ]

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <AppHeader onBackPress={onClose} />
        <View style={styles.body}>
          <AppText variant="captionStrong" color="accent">
            2 / 2
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {'정말 연결을\n해제할까요?'}
          </AppText>
          <View style={styles.steps}>
            {steps.map((text, index) => (
              <View key={text} style={styles.step}>
                <AppText variant="labelStrong" style={styles.stepNumber}>
                  {String(index + 1)}
                </AppText>
                <AppText variant="label" style={styles.stepText}>
                  {text}
                </AppText>
              </View>
            ))}
          </View>
          <TextField label={CONFIRM_LABEL} value={typed} onChangeText={setTyped} errorMessage={errorMessage} />
        </View>
        <View style={styles.footer}>
          <Button
            label="연결 해제"
            variant="danger"
            disabled={!isConfirmed}
            isLoading={isSubmitting}
            onPress={onConfirm}
          />
          <Button label="취소" variant="text" size="md" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingTop: SPACING[2], paddingHorizontal: SPACING.screen, gap: SPACING[5] },
  steps: { gap: SPACING[3], padding: 18, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  step: { flexDirection: 'row', gap: 10 },
  stepNumber: { width: 18 },
  stepText: { flex: 1 },
  footer: { position: 'absolute', left: SPACING.screen, right: SPACING.screen, bottom: SPACING[12], gap: 6 },
})

export default UnlinkConfirmModal
