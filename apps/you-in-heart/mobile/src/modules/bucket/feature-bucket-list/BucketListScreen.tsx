import type { BucketItem } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import UnlinkingBlockedSheet from '@/modules/couple/ui-unlinking-sheet/UnlinkingBlockedSheet'
import { isApiErrorKind } from '@/shared/api/api-error'
import { useToast } from '@/shared/hooks/use-toast'
import {
  useBucketItems,
  useCreateBucketItem,
  useDeleteBucketItem,
  useUpdateBucketItem,
} from '../data-access-bucket/useBucket'
import BucketDoneSheet from './BucketDoneSheet'
import BucketItemRow from './BucketItemRow'

const MAX_TITLE_LENGTH = 60
const WRITE_ERROR = '저장하지 못했어요. 잠시 후 다시 시도해 주세요'

// 쓰기 실패: 유예 중(409)이면 SCR-18 시트, 그 밖에는 짧은 안내
const useWriteErrors = () => {
  const toast = useToast()
  const [isBlocked, setIsBlocked] = useState(false)
  const onError = (error: unknown) =>
    isApiErrorKind(error, 'COUPLE_UNLINKING') ? setIsBlocked(true) : toast.show(WRITE_ERROR)
  return { toast, isBlocked, closeBlocked: () => setIsBlocked(false), onError }
}

const Progress = ({ done, total }: { done: number; total: number }) => (
  <View style={styles.progress}>
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${total === 0 ? 0 : (done / total) * 100}%` }]} />
    </View>
    <AppText variant="caption" color="ink2">{`${done} / ${total}`}</AppText>
  </View>
)

// SCR-12 버킷리스트: 추가(입력칸), 완료(→ 기록 연결 시트)·완료 취소, 길게 눌러 삭제. 두 사람 모두 쓸 수 있다
const BucketListScreen = () => {
  const insets = useSafeAreaInsets()
  const bucket = useBucketItems()
  const create = useCreateBucketItem()
  const update = useUpdateBucketItem()
  const remove = useDeleteBucketItem()
  const errors = useWriteErrors()
  const [title, setTitle] = useState('')
  const [completing, setCompleting] = useState<BucketItem | null>(null)
  const [deleting, setDeleting] = useState<BucketItem | null>(null)

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (trimmed === '' || create.isPending) return
    create.mutate(trimmed, { onSuccess: () => setTitle(''), onError: errors.onError })
  }
  const handleToggle = (item: BucketItem) => {
    if (item.doneAt === null) {
      update.reset()
      return setCompleting(item)
    }
    update.mutate({ id: item.id, body: { done: false } }, { onError: errors.onError })
  }
  const handleComplete = (item: BucketItem, entryId: string | null, after?: () => void) =>
    update.mutate(
      { id: item.id, body: entryId ? { done: true, entryId } : { done: true } },
      {
        onSuccess: () => {
          setCompleting(null)
          after?.()
        },
        // 시트 위에는 토스트가 가려진다 → 그 밖의 실패는 시트 안에서 보여준다
        onError: (error) => {
          if (!isApiErrorKind(error, 'COUPLE_UNLINKING')) return
          setCompleting(null)
          errors.onError(error)
        },
      },
    )
  const handleDelete = (item: BucketItem) =>
    remove.mutate(item.id, { onSuccess: () => setDeleting(null), onError: errors.onError })

  if (bucket.isError) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        <EmptyLayout icon="alert" title="목록을 불러오지 못했어요" onRetry={() => bucket.refetch()} />
      </View>
    )
  }

  const items = bucket.data ?? []
  const todo = items.filter((item) => item.doneAt === null)
  const done = items.filter((item) => item.doneAt !== null)
  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING[8] }]}>
        <AppText variant="title" style={styles.heading} accessibilityRole="header">
          함께 하고 싶은 것
        </AppText>
        <Progress done={done.length} total={items.length} />
        <View style={styles.field}>
          <Icon name="plus" size={18} color="ink3" />
          <TextInput
            accessibilityLabel="새로운 버킷리스트"
            placeholder="새로운 버킷리스트"
            placeholderTextColor={COLORS.ink3}
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            onChangeText={setTitle}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            editable={!create.isPending}
            style={styles.input}
          />
        </View>
        {bucket.isSuccess && items.length === 0 ? (
          <AppText variant="label" color="ink3" style={styles.empty}>
            둘이 함께 하고 싶은 것을 적어 보세요
          </AppText>
        ) : null}
        {todo.length > 0 ? <Section title="해보고 싶어요" items={todo} onToggle={handleToggle} onLongPress={setDeleting} /> : null}
        {done.length > 0 ? <Section title="해냈어요" items={done} onToggle={handleToggle} onLongPress={setDeleting} /> : null}
      </ScrollView>
      {completing ? (
        <BucketDoneSheet
          item={completing}
          isSaving={update.isPending}
          errorMessage={update.isError && !isApiErrorKind(update.error, 'COUPLE_UNLINKING') ? WRITE_ERROR : null}
          onClose={() => {
            setCompleting(null)
            update.reset()
          }}
          onComplete={(entryId) => handleComplete(completing, entryId)}
          onWriteNew={() => handleComplete(completing, null, () => router.push('/diary/new'))}
        />
      ) : null}
      <Dialog
        isVisible={deleting !== null}
        onClose={() => setDeleting(null)}
        title="이 항목을 지울까요?"
        description={deleting?.title}
        actions={
          <>
            <Button label="취소" variant="outline" size="md" onPress={() => setDeleting(null)} style={styles.flex} />
            <Button
              label="삭제"
              variant="danger"
              size="md"
              isLoading={remove.isPending}
              onPress={() => (deleting ? handleDelete(deleting) : undefined)}
              style={styles.flex}
            />
          </>
        }
      />
      <UnlinkingBlockedSheet
        isVisible={errors.isBlocked}
        onClose={errors.closeBlocked}
        onOpenStatus={() => router.push('/settings')}
      />
      <Toast message={errors.toast.message} />
    </View>
  )
}

type SectionProps = {
  title: string
  items: readonly BucketItem[]
  onToggle: (item: BucketItem) => void
  onLongPress: (item: BucketItem) => void
}

const Section = ({ title, items, onToggle, onLongPress }: SectionProps) => (
  <View>
    <AppText variant="captionStrong" color="ink3" style={styles.section} accessibilityRole="header">
      {title}
    </AppText>
    {items.map((item, index) => (
      <BucketItemRow
        key={item.id}
        item={item}
        isLast={index === items.length - 1}
        onToggle={() => onToggle(item)}
        onLongPress={() => onLongPress(item)}
      />
    ))}
  </View>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[1] },
  heading: { fontSize: 24 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: SPACING[3] },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  fill: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING[5],
    height: 52,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  input: { ...TYPOGRAPHY.body, flex: 1, color: COLORS.ink, padding: 0 },
  empty: { paddingTop: SPACING[6], textAlign: 'center' },
  section: { fontSize: 12, paddingTop: SPACING[5], paddingBottom: SPACING[1] },
  flex: { flex: 1 },
})

export default BucketListScreen
