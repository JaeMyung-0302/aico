import { StyleSheet } from 'react-native'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'

type ConfirmDeleteDialogProps = {
  isVisible: boolean
  title: string
  description: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

// 펫·접종 기록 삭제 확인 (게시물 삭제와 같은 취소 / 삭제 2열)
const ConfirmDeleteDialog = ({ isVisible, title, description, isDeleting, onCancel, onConfirm }: ConfirmDeleteDialogProps) => (
  <Dialog
    isVisible={isVisible}
    onClose={onCancel}
    title={title}
    description={description}
    actions={
      <>
        <Button label="취소" variant="secondary" size="md" style={styles.action} onPress={onCancel} />
        <Button
          label="삭제"
          variant="danger"
          size="md"
          style={styles.action}
          isLoading={isDeleting}
          onPress={onConfirm}
        />
      </>
    }
  />
)

const styles = StyleSheet.create({ action: { flex: 1 } })

export default ConfirmDeleteDialog
