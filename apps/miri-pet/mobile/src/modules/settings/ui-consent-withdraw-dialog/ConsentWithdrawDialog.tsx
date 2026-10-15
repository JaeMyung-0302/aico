import { StyleSheet } from 'react-native'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'

type ConsentWithdrawDialogProps = {
  // null이면 닫힌 상태
  target: { label: string; description: string } | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
}

// 동의 철회 확인 창 (선택 동의·증명서 보관 동의 공통)
const ConsentWithdrawDialog = ({ target, isSubmitting, onClose, onConfirm }: ConsentWithdrawDialogProps) =>
  target ? (
    <Dialog
      isVisible
      onClose={isSubmitting ? () => undefined : onClose}
      title={`${target.label} 동의를 철회할까요?`}
      description={target.description}
      actions={
        <>
          <Button
            label="취소"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onPress={onClose}
            style={styles.action}
          />
          <Button
            label="철회하기"
            variant="danger"
            size="md"
            isLoading={isSubmitting}
            onPress={onConfirm}
            style={styles.action}
          />
        </>
      }
    />
  ) : null

const styles = StyleSheet.create({
  action: { flex: 1 },
})

export default ConsentWithdrawDialog
