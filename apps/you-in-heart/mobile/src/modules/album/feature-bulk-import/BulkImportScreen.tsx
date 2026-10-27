import { useMutation, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { uploadQueue } from '@/modules/media/data-access-media/upload-queue-store'
import PhotoPermissionNotice from '@/modules/media/ui-photo-permission/PhotoPermissionNotice'
import type { DateRange } from '@/modules/media/util-pick-assets/list-assets-by-date-range'
import { ensurePhotoPermission } from '@/modules/media/util-pick-assets/pick-assets'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { startBulkImport } from '../data-access-album/start-bulk-import'
import BulkProgressCard from './BulkProgressCard'
import CustomRangeSheet from './CustomRangeSheet'
import { buildRangeOptions, type RangeOption, type RangeOptionId } from './range-options'
import RangeOptionList from './RangeOptionList'
import { type BulkProgress, useBulkProgress } from './useBulkProgress'

const leave = () => (router.canGoBack() ? router.back() : router.replace('/album'))

const RunningActions = ({ isPaused }: { isPaused: boolean }) => (
  <View style={styles.actions}>
    <Button
      label={isPaused ? '이어서 올리기' : '일시정지'}
      variant="outline"
      onPress={() => uploadQueue.getState().setPaused(!isPaused)}
      style={styles.action}
    />
    <Button label="뒤에서 계속" variant="dark" onPress={leave} style={styles.action} />
  </View>
)

const DoneSummary = ({ progress }: { progress: BulkProgress }) => (
  <View style={styles.done}>
    <AppText variant="title">{`사진 ${progress.done.toLocaleString('ko-KR')}장을 앨범에 모았어요`}</AppText>
    {progress.failed > 0 ? (
      <AppText variant="label" color="ink2">{`${progress.failed}장은 올리지 못했어요.`}</AppText>
    ) : null}
    {progress.retryable > 0 ? (
      <Button label="다시 올리기" variant="outline" size="md" onPress={() => uploadQueue.getState().retryFailed()} />
    ) : null}
    <Button
      label="앨범 보기"
      variant="dark"
      onPress={() => {
        uploadQueue.getState().finishBulk()
        leave()
      }}
    />
  </View>
)

const useRangeChoice = () => {
  const me = useMe()
  const [nowMs] = useState(() => Date.now())
  const [custom, setCustom] = useState<DateRange | null>(null)
  const startedOn = me.data?.couple?.startedOn ?? null
  const options = buildRangeOptions({ startedOn, nowMs, custom })
  const [selectedId, setSelectedId] = useState<RangeOptionId | null>(null)
  const selected = options.find((option) => option.id === (selectedId ?? options[0]?.id)) ?? null
  return { options, selected, setSelectedId, setCustom }
}

// SCR-08 지난 사진 일괄 등록: 기간 선택 → 진행률(일시정지·뒤에서 계속) → 완료. 앱을 다시 열면 이어서 올린다
const BulkImportScreen = () => {
  const insets = useSafeAreaInsets()
  const progress = useBulkProgress()
  const choice = useRangeChoice()
  const [isCustomSheetVisible, setIsCustomSheetVisible] = useState(false)
  const permission = useQuery({ queryKey: ['media-library', 'permission'], queryFn: ensurePhotoPermission, gcTime: 0 })
  const start = useMutation({ mutationFn: (range: DateRange) => startBulkImport(range) })
  const isDone = progress.hasSession && progress.pending === 0
  const handleSelect = (option: RangeOption) => {
    choice.setSelectedId(option.id)
    if (option.id === 'custom') setIsCustomSheetVisible(true)
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING[2] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={leave} style={styles.icon}>
        <Icon name="close" />
      </Pressable>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.intro}>
          <AppText variant="title" style={styles.title}>
            {'지금까지 찍은 사진을\n앨범에 모을까요?'}
          </AppText>
          <AppText variant="label" color="ink2">
            고른 기간의 사진을 날짜별로 정리해서 올려요. 원본도 함께 보관돼요.
          </AppText>
        </View>
        {permission.data === false ? <PhotoPermissionNotice /> : null}
        {permission.data && !progress.hasSession ? (
          <RangeOptionList options={choice.options} selectedId={choice.selected?.id ?? 'recent'} onSelect={handleSelect} />
        ) : null}
        {progress.hasSession && !isDone ? <BulkProgressCard progress={progress} /> : null}
        {isDone ? <DoneSummary progress={progress} /> : null}
        {start.data?.total === 0 ? (
          <AppText variant="caption" color="ink2">
            고른 기간에 가져올 사진이 없어요
          </AppText>
        ) : null}
        {start.isError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            가져오지 못했어요. 잠시 후 다시 시도해 주세요
          </AppText>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING[6] }]}>
        {progress.hasSession && !isDone ? <RunningActions isPaused={progress.isPaused} /> : null}
        {permission.data && !progress.hasSession ? (
          <Button
            label="가져오기"
            isLoading={start.isPending}
            disabled={!choice.selected?.range}
            onPress={() => choice.selected?.range && start.mutate(choice.selected.range)}
          />
        ) : null}
      </View>
      <CustomRangeSheet
        isVisible={isCustomSheetVisible}
        onClose={() => setIsCustomSheetVisible(false)}
        onConfirm={(range) => {
          choice.setCustom(range)
          setIsCustomSheetVisible(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, marginLeft: SPACING[3], alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[4], gap: SPACING[6] },
  intro: { gap: SPACING[2] },
  title: { fontSize: 24, lineHeight: 34 },
  done: { gap: SPACING[3] },
  footer: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[3] },
  actions: { flexDirection: 'row', gap: SPACING[2] },
  action: { flex: 1 },
})

export default BulkImportScreen
