import type { Comment, ReportReason } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import BottomSheet from '@/design-system/components/BottomSheet'
import Icon from '@/design-system/components/Icon'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useBlockUser, useCreateReport } from '@/modules/moderation/data-access-moderation/useModeration'
import ReportSheet from '@/modules/moderation/ui-report-sheet/ReportSheet'
import { formatRelativeTime } from '@/shared/format/format-relative-time'

type CommentRowProps = {
  comment: Comment
  isPostAuthor: boolean
  // 내 댓글이거나 내 게시물이면 지울 수 있다
  canDelete: boolean
  onDelete: (commentId: string) => void
}

type Sheet = 'closed' | 'delete' | 'report'

const CommentRow = ({ comment, isPostAuthor, canDelete, onDelete }: CommentRowProps) => {
  const [sheet, setSheet] = useState<Sheet>('closed')
  const createReport = useCreateReport()
  const blockUser = useBlockUser()
  const handleSubmitReport = async (reason: ReportReason) => {
    await createReport.mutateAsync({ targetType: 'COMMENT', targetId: comment.id, reason })
  }
  const handleBlock = async () => {
    await blockUser.mutateAsync(comment.author.id)
  }
  const handleDelete = () => {
    setSheet('closed')
    onDelete(comment.id)
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${comment.author.nickname} 프로필`}
        onPress={() => router.push(`/users/${comment.author.id}`)}
      >
        <Avatar name={comment.author.nickname} uri={comment.author.avatarUrl} size={32} />
      </Pressable>
      <View style={styles.text}>
        <AppText variant="callout">
          <AppText variant="calloutStrong">{comment.author.nickname}</AppText> {comment.body}
        </AppText>
        <AppText variant="caption" color="ink3">
          {isPostAuthor ? `${formatRelativeTime(comment.createdAt)} · 작성자` : formatRelativeTime(comment.createdAt)}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="댓글 더보기"
        onPress={() => setSheet(canDelete ? 'delete' : 'report')}
        style={styles.more}
      >
        <Icon name="more" size={18} color="ink3" />
      </Pressable>
      <BottomSheet isVisible={sheet === 'delete'} onClose={() => setSheet('closed')}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="댓글 삭제"
          onPress={handleDelete}
          style={styles.sheetRow}
        >
          <AppText variant="bodyStrong" color="danger">
            댓글 삭제
          </AppText>
        </Pressable>
      </BottomSheet>
      {canDelete ? null : (
        <ReportSheet
          isVisible={sheet === 'report'}
          onClose={() => setSheet('closed')}
          target={{ type: 'COMMENT', id: comment.id }}
          author={{ id: comment.author.id, nickname: comment.author.nickname }}
          onSubmitReport={handleSubmitReport}
          onBlock={handleBlock}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md - 2, paddingLeft: SPACING.lg },
  text: { flex: 1, gap: SPACING.xxs, paddingTop: SPACING.xxs },
  more: { width: TOUCH_TARGET, height: TOUCH_TARGET - SPACING.sm, alignItems: 'center', justifyContent: 'center' },
  sheetRow: { minHeight: TOUCH_TARGET + SPACING.sm, justifyContent: 'center', paddingHorizontal: SPACING.lg },
})

export default CommentRow
