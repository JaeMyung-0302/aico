import type { DiaryEntry } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { isApiErrorKind } from '@/shared/api/api-error'
import { trackMemoryViewed } from '../data-access-diary/diary-api'
import { useDeleteDiary } from '../data-access-diary/useDeleteDiary'
import { useDiaryEntry } from '../data-access-diary/useDiaryEntry'
import { dayCountOn, formatDiaryDate, withSubjectParticle } from '../util-diary/format-diary-date'
import DiaryActions, { type DiaryActionsStep } from './DiaryActions'
import PhotoCarousel from './PhotoCarousel'

const AUTO_DAY_TITLE = '그날의 사진'
const FORMER_MEMBER = '탈퇴한 사용자'

const leaveDetail = () => {
  if (router.canGoBack()) router.back()
  else router.replace('/timeline')
}

const useDiaryMeta = (entry: DiaryEntry | undefined) => {
  const me = useMe()
  const couple = useCouple({ isEnabled: Boolean(me.data?.couple) })
  const startedOn = couple.data?.startedOn ?? me.data?.couple?.startedOn ?? null
  const author = couple.data?.members.find((member) => member.userId === entry?.authorId)
  return {
    isAuthor: Boolean(entry?.authorId) && entry?.authorId === me.data?.id,
    authorName: entry?.authorId ? (author?.displayName ?? '상대') : FORMER_MEMBER,
    dayCount: entry ? dayCountOn(startedOn, entry.happenedOn) : null,
  }
}

// SCR-18 404(지워진 기록·다른 커플 id)와 서버 오류
const DetailError = ({ error, onRetry }: { error: unknown; onRetry: () => void }) => {
  const isMissing = isApiErrorKind(error, 'NOT_FOUND')
  return (
    <View style={styles.screen}>
      <AppHeader />
      <EmptyLayout
        icon="alert"
        title={isMissing ? '기록을 찾을 수 없어요' : '잠시 문제가 생겼어요'}
        description={isMissing ? '삭제되었거나 볼 수 없는 기록이에요.' : '잠시 뒤 다시 시도해 주세요.'}
        onRetry={isMissing ? undefined : onRetry}
        action={isMissing ? { label: '타임라인으로', onPress: () => router.replace('/timeline') } : undefined}
      />
    </View>
  )
}

type DiaryBodyProps = { entry: DiaryEntry; dayCount: number | null; authorName: string }

const DiaryBody = ({ entry: { title, body, happenedOn, kind }, dayCount, authorName }: DiaryBodyProps) => (
  <View style={styles.body}>
    <AppText variant="caption" color="ink3">
      {dayCount ? `${formatDiaryDate(happenedOn)} · ${dayCount}일째` : formatDiaryDate(happenedOn)}
    </AppText>
    {title || kind === 'AUTO_DAY' ? (
      <AppText variant="title" style={styles.title}>
        {title ?? AUTO_DAY_TITLE}
      </AppText>
    ) : null}
    {body ? <AppText style={styles.text}>{body}</AppText> : null}
    <View style={styles.meta}>
      <View style={styles.avatar} />
      <AppText variant="caption" color="ink2">{`${withSubjectParticle(authorName)} 남김`}</AppText>
    </View>
  </View>
)

type DiaryDetailScreenProps = { entryId: string }

// SCR-06 일기 상세. 열 때 memory_viewed 1건. 수정·삭제는 작성자에게만 보인다
const DiaryDetailScreen = ({ entryId }: DiaryDetailScreenProps) => {
  const insets = useSafeAreaInsets()
  const entry = useDiaryEntry(entryId)
  const meta = useDiaryMeta(entry.data)
  const remove = useDeleteDiary()
  const [step, setStep] = useState<DiaryActionsStep>('none')

  useEffect(() => {
    trackMemoryViewed().catch(() => undefined)
  }, [entryId])

  if (!entry.data) {
    return entry.isError ? <DetailError error={entry.error} onRetry={() => entry.refetch()} /> : <View style={styles.screen} />
  }

  const { photos } = entry.data
  const readyPhotos = photos.filter((photo) => photo.status === 'READY')
  const hasPhotos = photos.length > 0
  const moreButton = meta.isAuthor ? (
    <Pressable accessibilityRole="button" accessibilityLabel="더보기" onPress={() => setStep('menu')} style={styles.icon}>
      <Icon name="more" />
    </Pressable>
  ) : null
  const handleDelete = () => remove.mutate(entryId, { onSuccess: () => leaveDetail() })

  return (
    <View style={styles.screen}>
      {hasPhotos ? null : <AppHeader right={moreButton} />}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + SPACING[8] }}>
        {readyPhotos.length > 0 ? <PhotoCarousel photos={readyPhotos} /> : null}
        {hasPhotos && readyPhotos.length === 0 ? <View style={styles.pendingPhotos} /> : null}
        <DiaryBody entry={entry.data} dayCount={meta.dayCount} authorName={meta.authorName} />
      </ScrollView>
      {hasPhotos ? (
        <View style={[styles.overlay, { top: insets.top + SPACING[2] }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={leaveDetail} style={styles.icon}>
            <Icon name="back" />
          </Pressable>
          {moreButton}
        </View>
      ) : null}
      <DiaryActions
        step={step}
        photoCount={photos.length}
        isDeleting={remove.isPending}
        errorMessage={remove.isError ? '삭제하지 못했어요. 잠시 후 다시 시도해 주세요' : null}
        onStepChange={(next) => {
          setStep(next)
          remove.reset()
        }}
        onEdit={() => {
          setStep('none')
          router.push({ pathname: '/diary/new', params: { entryId } })
        }}
        onDelete={handleDelete}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  overlay: { position: 'absolute', left: SPACING[3], right: SPACING[3], flexDirection: 'row', justifyContent: 'space-between' },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  pendingPhotos: { height: 440, backgroundColor: PHOTO_PLACEHOLDER[0] },
  body: { padding: SPACING.screen, gap: 14 },
  title: { fontSize: 24, lineHeight: 34 },
  text: { lineHeight: 26 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6 },
  avatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: PHOTO_PLACEHOLDER[0] },
})

export default DiaryDetailScreen
