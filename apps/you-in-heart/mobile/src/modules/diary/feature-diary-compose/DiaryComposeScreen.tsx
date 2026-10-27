import { MAX_PHOTOS_PER_ENTRY } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import UnlinkingBlockedSheet from '@/modules/couple/ui-unlinking-sheet/UnlinkingBlockedSheet'
import PinSuggestionSheet from '@/modules/map/feature-pin-suggestion/PinSuggestionSheet'
import { retryEntryUploads } from '@/modules/media/data-access-media/useUploadPhotos'
import { ensurePhotoPermission } from '@/modules/media/util-pick-assets/pick-assets'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { isApiErrorKind } from '@/shared/api/api-error'
import PhotoGridPicker from '../ui-photo-grid-picker/PhotoGridPicker'
import { formatDiaryDate } from '../util-diary/format-diary-date'
import ComposePhotoStrip from './ComposePhotoStrip'
import DiaryDateSheet from './DiaryDateSheet'
import PhotoPermissionNotice from '@/modules/media/ui-photo-permission/PhotoPermissionNotice'
import UploadStatusCard from './UploadStatusCard'
import { useDiaryComposer } from './useDiaryComposer'

type DiaryComposeScreenProps = {
  // 있으면 수정(작성자만 — 상세의 더보기 메뉴에서 온다)
  entryId?: string
}

type Sheet = 'none' | 'picker' | 'date'

type ComposeHeaderProps = {
  topInset: number
  isBusy: boolean
  isSaveVisible: boolean
  canSave: boolean
  onClose: () => void
  onSave: () => void
}

const ComposeHeader = ({ topInset, isBusy, isSaveVisible, canSave, onClose, onSave }: ComposeHeaderProps) => (
  <View style={[styles.top, { paddingTop: topInset + SPACING[2] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.icon}>
      <Icon name="close" />
    </Pressable>
    {isBusy ? (
      <AppText variant="label" color="ink2" style={styles.busy}>
        저장하는 중…
      </AppText>
    ) : null}
    {isSaveVisible ? <Button label="저장" size="md" disabled={!canSave} onPress={onSave} style={styles.save} /> : null}
  </View>
)

type ComposeFieldsProps = {
  hasLocationConsent: boolean
  title: string
  body: string
  onTitleChange: (title: string) => void
  onBodyChange: (body: string) => void
}

// 장소: 저장한 뒤 사진 위치로 찾은 곳을 제안한다(2B.3). 위치 사용이 꺼져 있으면 설정으로 안내
const PlaceHint = ({ hasLocationConsent }: { hasLocationConsent: boolean }) => (
  <Pressable
    accessibilityRole={hasLocationConsent ? undefined : 'button'}
    disabled={hasLocationConsent}
    onPress={() => router.push('/settings')}
    style={styles.place}
  >
    <Icon name="map" size={18} color="ink3" />
    <AppText variant="label" color="ink3" style={styles.placeText}>
      {hasLocationConsent
        ? '저장하면 사진 위치로 다녀온 곳을 찾아드려요'
        : '사진 위치 사용을 켜면 다녀온 곳을 지도에 남길 수 있어요'}
    </AppText>
  </Pressable>
)

// 제목(세리프 22)·본문·장소 안내
const ComposeFields = ({ hasLocationConsent, title, body, onTitleChange, onBodyChange }: ComposeFieldsProps) => (
  <>
    <TextInput
      accessibilityLabel="제목"
      placeholder="제목"
      placeholderTextColor={COLORS.ink3}
      value={title}
      onChangeText={onTitleChange}
      style={styles.title}
    />
    <TextInput
      accessibilityLabel="본문"
      placeholder="오늘은 어떤 하루였나요?"
      placeholderTextColor={COLORS.ink3}
      value={body}
      onChangeText={onBodyChange}
      multiline
      style={styles.text}
    />
    <PlaceHint hasLocationConsent={hasLocationConsent} />
  </>
)

// SCR-05 일기 작성·수정. 사진이 있으면 저장 뒤 핀 제안 시트(SCR-10)를 띄운다
const DiaryComposeScreen = ({ entryId }: DiaryComposeScreenProps) => {
  const insets = useSafeAreaInsets()
  const composer = useDiaryComposer(entryId)
  const { form, setForm, assets, savedEntryId, summary, save, pins } = composer
  const me = useMe()
  const [sheet, setSheet] = useState<Sheet>('none')
  const [isPermissionDenied, setIsPermissionDenied] = useState(false)
  const [isUnlinkingSheetDismissed, setIsUnlinkingSheetDismissed] = useState(false)
  const isUploading = savedEntryId !== null
  const uploadsByAsset = useMemo(
    () => new Map(composer.uploads.map((item) => [item.assetId, item])),
    [composer.uploads],
  )

  const handleAddPress = async () => {
    const isGranted = await ensurePhotoPermission().catch(() => false)
    setIsPermissionDenied(!isGranted)
    if (isGranted) setSheet('picker')
  }
  const handleRetryPress = () => {
    if (savedEntryId) retryEntryUploads(savedEntryId)
  }
  const isBusy = save.isPending || (isUploading && summary.pending > 0)

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ComposeHeader
        topInset={insets.top}
        isBusy={isBusy}
        isSaveVisible={!isUploading && !isBusy}
        canSave={composer.canSave}
        onClose={composer.close}
        onSave={composer.submit}
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING[8] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`날짜 ${formatDiaryDate(form.happenedOn)}`}
          disabled={isUploading}
          onPress={() => setSheet('date')}
          style={styles.date}
        >
          <Icon name="calendar" size={18} color="ink2" />
          <AppText variant="label" color="ink2">
            {formatDiaryDate(form.happenedOn)}
          </AppText>
        </Pressable>
        {isPermissionDenied && assets.length === 0 ? <PhotoPermissionNotice /> : null}
        {isPermissionDenied && assets.length === 0 ? null : (
          <ComposePhotoStrip
            existingPhotos={composer.existingPhotos}
            assets={assets}
            uploadsByAsset={uploadsByAsset}
            isLocked={isUploading}
            onAddPress={() => {
              handleAddPress().catch(() => undefined)
            }}
            onRetryPress={handleRetryPress}
          />
        )}
        {isUploading ? (
          <UploadStatusCard summary={summary} onRetryPress={handleRetryPress} />
        ) : (
          <ComposeFields
            hasLocationConsent={me.data?.consents.location === true}
            title={form.title}
            body={form.body}
            onTitleChange={(title) => setForm({ ...form, title })}
            onBodyChange={(body) => setForm({ ...form, body })}
          />
        )}
        {save.isError && !isApiErrorKind(save.error, 'COUPLE_UNLINKING') ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            저장하지 못했어요. 잠시 후 다시 시도해 주세요
          </AppText>
        ) : null}
      </ScrollView>
      {sheet === 'picker' ? (
        <PhotoGridPicker
          selected={assets}
          maxCount={MAX_PHOTOS_PER_ENTRY - composer.existingPhotos.length}
          onClose={() => setSheet('none')}
          onConfirm={(picked) => {
            composer.setAssets(picked)
            setSheet('none')
          }}
        />
      ) : null}
      <DiaryDateSheet
        key={sheet === 'date' ? 'open' : 'closed'}
        isVisible={sheet === 'date'}
        value={form.happenedOn}
        onClose={() => setSheet('none')}
        onConfirm={(happenedOn) => {
          setForm({ ...form, happenedOn })
          setSheet('none')
        }}
      />
      {pins.sheet ? (
        <PinSuggestionSheet
          isVisible
          entryId={pins.sheet.entryId}
          suggestions={pins.sheet.suggestions}
          isManualOnly={pins.sheet.isManualOnly}
          onClose={pins.close}
          onDone={pins.close}
          onPickOnMap={pins.pickOnMap}
        />
      ) : null}
      <UnlinkingBlockedSheet
        isVisible={isApiErrorKind(save.error, 'COUPLE_UNLINKING') && !isUnlinkingSheetDismissed}
        onClose={() => setIsUnlinkingSheetDismissed(true)}
        onOpenStatus={() => router.push('/settings')}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[1],
  },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  busy: { marginRight: SPACING[4] },
  save: { height: 36, paddingHorizontal: SPACING[4], marginRight: SPACING[2] },
  body: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[1], gap: 18 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH_TARGET, alignSelf: 'flex-start' },
  title: { ...TYPOGRAPHY.title, color: COLORS.ink, padding: 0 },
  text: { ...TYPOGRAPHY.body, lineHeight: 26, color: COLORS.ink, padding: 0, minHeight: 160, textAlignVertical: 'top' },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  placeText: { flex: 1 },
})

export default DiaryComposeScreen
