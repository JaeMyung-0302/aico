import type { Post, ReportReason } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import Icon from '@/design-system/components/Icon'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useBlockUser, useCreateReport } from '@/modules/moderation/data-access-moderation/useModeration'
import ReportSheet from '@/modules/moderation/ui-report-sheet/ReportSheet'
import { useDeletePost } from '@/modules/posts/data-access-posts/usePosts'

type PostMenuProps = {
  post: Pick<Post, 'id' | 'author'>
  isMine: boolean
  // 상세 화면에서 삭제하면 뒤로 간다
  onDeleted?: () => void
}

type Step = 'closed' | 'mine' | 'confirmDelete' | 'report'

// "…" 메뉴: 내 글이면 삭제, 남의 글이면 신고·차단(18 ReportSheet)
const PostMenu = ({ post, isMine, onDeleted }: PostMenuProps) => {
  const [step, setStep] = useState<Step>('closed')
  const deletePost = useDeletePost()
  const createReport = useCreateReport()
  const blockUser = useBlockUser()

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id)
    setStep('closed')
    onDeleted?.()
  }
  const handleSubmitReport = async (reason: ReportReason) => {
    await createReport.mutateAsync({ targetType: 'POST', targetId: post.id, reason })
  }
  const handleBlock = async () => {
    await blockUser.mutateAsync(post.author.id)
  }
  const handleViewProfile = () => {
    setStep('closed')
    router.push(`/users/${post.author.id}`)
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="게시물 더보기"
        onPress={() => setStep(isMine ? 'mine' : 'report')}
        style={styles.iconButton}
      >
        <Icon name="more" color="ink2" size={20} />
      </Pressable>
      <BottomSheet isVisible={step === 'mine'} onClose={() => setStep('closed')}>
        <Pressable accessibilityRole="button" onPress={() => setStep('confirmDelete')} style={styles.row}>
          <AppText variant="bodyStrong" color="danger">
            게시물 삭제
          </AppText>
        </Pressable>
      </BottomSheet>
      <Dialog
        isVisible={step === 'confirmDelete'}
        onClose={() => setStep('closed')}
        title="게시물을 삭제할까요?"
        description="사진과 댓글이 함께 지워지고 되돌릴 수 없어요."
        actions={
          <>
            <Button
              label="취소"
              variant="secondary"
              size="md"
              style={styles.action}
              onPress={() => setStep('closed')}
            />
            <Button
              label="삭제"
              variant="danger"
              size="md"
              style={styles.action}
              isLoading={deletePost.isPending}
              onPress={handleDelete}
            />
          </>
        }
      />
      {isMine ? null : (
        <ReportSheet
          isVisible={step === 'report'}
          onClose={() => setStep('closed')}
          target={{ type: 'POST', id: post.id }}
          author={{ id: post.author.id, nickname: post.author.nickname }}
          onSubmitReport={handleSubmitReport}
          onBlock={handleBlock}
          onViewProfile={handleViewProfile}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  iconButton: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: TOUCH_TARGET + SPACING.sm, justifyContent: 'center', paddingHorizontal: SPACING.lg },
  action: { flex: 1 },
})

export default PostMenu
