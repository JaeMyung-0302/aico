import { StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'

type WithdrawDialogProps = {
  isVisible: boolean
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: () => void
}

// 회원 탈퇴 확인 — 확인 전에는 DELETE /me 를 보내지 않는다
const WithdrawDialog = ({ isVisible, isSubmitting, errorMessage, onClose, onConfirm }: WithdrawDialogProps) => (
  <Dialog
    isVisible={isVisible}
    onClose={onClose}
    title="회원 탈퇴할까요?"
    description="연결된 커플은 연결 해제 유예로 바뀌고, 30일 뒤 사진 원본을 포함한 모든 기록이 지워져요. 카카오 연결도 함께 해제돼요."
    actions={
      <>
        <Button label="취소" variant="outline" size="md" onPress={onClose} style={styles.action} />
        <Button
          label="탈퇴"
          variant="danger"
          size="md"
          isLoading={isSubmitting}
          onPress={onConfirm}
          style={styles.action}
        />
      </>
    }
  >
    {errorMessage ? (
      <AppText variant="caption" color="danger" accessibilityRole="alert">
        {errorMessage}
      </AppText>
    ) : null}
  </Dialog>
)

const styles = StyleSheet.create({
  action: { flex: 1 },
})

export default WithdrawDialog
