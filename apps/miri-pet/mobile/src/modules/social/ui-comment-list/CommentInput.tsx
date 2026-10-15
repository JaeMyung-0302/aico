import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'

const COMMENT_MAX = 500

type CommentInputProps = {
  isSubmitting: boolean
  // 성공하면 true → 입력창을 비운다
  onSubmit: (body: string) => Promise<boolean>
}

// 05 하단 댓글 입력 바
const CommentInput = ({ isSubmitting, onSubmit }: CommentInputProps) => {
  const insets = useSafeAreaInsets()
  const [body, setBody] = useState('')
  const trimmed = body.trim()
  const canSubmit = trimmed.length > 0 && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (await onSubmit(trimmed)) setBody('')
  }

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + SPACING.sm }]}>
      <TextInput
        accessibilityLabel="댓글 입력"
        placeholder="댓글 달기…"
        placeholderTextColor={COLORS.ink3}
        value={body}
        onChangeText={setBody}
        maxLength={COMMENT_MAX}
        style={styles.input}
        multiline
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="댓글 게시"
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={styles.submit}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <AppText variant="bodyStrong" color={canSubmit ? 'primary' : 'ink3'}>
            게시
          </AppText>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    ...TYPOGRAPHY.callout,
    flex: 1,
    maxHeight: 96,
    minHeight: TOUCH_TARGET - SPACING.xs,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.ground,
    color: COLORS.ink,
  },
  submit: { minWidth: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
})

export default CommentInput
