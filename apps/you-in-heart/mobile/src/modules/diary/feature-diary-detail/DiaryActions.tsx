import { StyleSheet, View } from 'react-native'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import ListRow from '@/design-system/components/ListRow'
import { SPACING } from '@/design-system/tokens/spacing'

export type DiaryActionsStep = 'none' | 'menu' | 'confirmDelete'

type DiaryActionsProps = {
  step: DiaryActionsStep
  photoCount: number
  isDeleting: boolean
  errorMessage: string | null
  onStepChange: (step: DiaryActionsStep) => void
  onEdit: () => void
  onDelete: () => void
}

const deleteDescription = (photoCount: number): string =>
  photoCount > 0
    ? `사진 ${photoCount}장과 원본도 함께 지워지고, 되돌릴 수 없어요. 상대 화면에서도 사라져요.`
    : '되돌릴 수 없어요. 상대 화면에서도 사라져요.'

// SCR-06 작성자 전용 더보기(수정·삭제) 시트와 삭제 확인 다이얼로그
const DiaryActions = ({
  step,
  photoCount,
  isDeleting,
  errorMessage,
  onStepChange,
  onEdit,
  onDelete,
}: DiaryActionsProps) => {
  const close = () => onStepChange('none')
  return (
    <>
      <BottomSheet isVisible={step === 'menu'} onClose={close}>
        <View style={styles.menu}>
          <ListRow title="수정하기" trailing={null} onPress={onEdit} />
          <ListRow title="삭제하기" titleColor="danger" trailing={null} onPress={() => onStepChange('confirmDelete')} />
        </View>
      </BottomSheet>
      <Dialog
        isVisible={step === 'confirmDelete'}
        onClose={close}
        title="이 기록을 삭제할까요?"
        description={errorMessage ?? deleteDescription(photoCount)}
        actions={
          <>
            <Button label="취소" variant="outline" size="md" onPress={close} style={styles.action} />
            <Button label="삭제" variant="danger" size="md" isLoading={isDeleting} onPress={onDelete} style={styles.action} />
          </>
        }
      />
    </>
  )
}

const styles = StyleSheet.create({
  menu: { marginHorizontal: -SPACING.screen },
  action: { flex: 1 },
})

export default DiaryActions
