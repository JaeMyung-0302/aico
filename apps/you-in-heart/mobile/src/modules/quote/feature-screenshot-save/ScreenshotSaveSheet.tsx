import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import PhotoGridPicker from '@/modules/diary/ui-photo-grid-picker/PhotoGridPicker'
import { ensurePhotoPermission, resolveAsset } from '@/modules/media/util-pick-assets/pick-assets'
import { ScreenshotInvalidError, saveScreenshot } from '../data-access-quote/save-screenshot'
import { QUOTES_QUERY_KEY } from '../data-access-quote/useQuotes'

type ScreenshotSaveSheetProps = {
  isVisible: boolean
  // 공유로 받은 이미지 경로(SCR-14). 없으면 보관함에서 고른다
  initialUri: string | null
  onClose: () => void
  onSaved: () => void
}

const MAX_MEMO_LENGTH = 500
const INVALID_MESSAGE = '이 이미지는 저장할 수 없어요. 다른 사진을 골라 주세요'
const SAVE_ERROR = '저장하지 못했어요. 잠시 후 다시 시도해 주세요'
const PICK_ERROR = '사진에 접근할 수 없어요. 설정에서 사진 접근을 허용해 주세요'

const useScreenshotSave = (onSaved: () => void) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveScreenshot,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY })
      onSaved()
    },
  })
}

// SCR-13 스크린샷 저장 시트: 고르기(또는 공유 받은 이미지) → 미리보기 → 메모 → 표시용으로 줄여 업로드
const ScreenshotSaveSheet = ({ isVisible, initialUri, onClose, onSaved }: ScreenshotSaveSheetProps) => {
  const [uri, setUri] = useState<string | null>(initialUri)
  const [memo, setMemo] = useState('')
  const [isPicking, setIsPicking] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const save = useScreenshotSave(onSaved)

  const handlePickPress = async () => {
    const isGranted = await ensurePhotoPermission().catch(() => false)
    setPickError(isGranted ? null : PICK_ERROR)
    setIsPicking(isGranted)
  }
  // 보관함 자산 → 실제 파일. 촬영 위치는 읽어도 보내지 않는다(스크린샷은 표시용만 올린다)
  const handlePicked = async (assetId: string) => {
    setIsPicking(false)
    const asset = await resolveAsset(assetId).catch(() => null)
    setPickError(asset ? null : INVALID_MESSAGE)
    if (asset) {
      setUri(asset.localUri)
      save.reset()
    }
  }
  const errorMessage = save.error instanceof ScreenshotInvalidError ? INVALID_MESSAGE : save.isError ? SAVE_ERROR : pickError

  if (isPicking) {
    return (
      <PhotoGridPicker
        selected={[]}
        maxCount={1}
        onClose={() => setIsPicking(false)}
        onConfirm={([picked]) => {
          if (picked) handlePicked(picked.id).catch(() => undefined)
          else setIsPicking(false)
        }}
      />
    )
  }

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <AppText variant="heading" accessibilityRole="header">
        스크린샷 저장
      </AppText>
      {uri ? <Image source={{ uri }} style={styles.preview} contentFit="contain" /> : null}
      <Button
        label={uri ? '다른 스크린샷 고르기' : '스크린샷 고르기'}
        variant={uri ? 'text' : 'outline'}
        size="md"
        disabled={save.isPending}
        onPress={() => {
          handlePickPress().catch(() => undefined)
        }}
      />
      <TextField
        label="메모 (선택)"
        placeholder="이 말을 들었던 순간"
        value={memo}
        maxLength={MAX_MEMO_LENGTH}
        onChangeText={setMemo}
      />
      {errorMessage ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {errorMessage}
        </AppText>
      ) : null}
      <Button
        label="보관함에 저장"
        disabled={!uri}
        isLoading={save.isPending}
        onPress={() => (uri ? save.mutate({ sourceUri: uri, memo: memo.trim() || undefined }) : undefined)}
      />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  preview: { height: 220, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
})

export default ScreenshotSaveSheet
