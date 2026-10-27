import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { isApiErrorKind } from '@/shared/api/api-error'
import { useNow } from '@/shared/hooks/use-now'
import { useCouple } from '../data-access-couple/useCouple'
import { useUpdateStartedOn } from '../data-access-couple/useUpdateStartedOn'
import UnlinkingBlockedSheet from '../ui-unlinking-sheet/UnlinkingBlockedSheet'
import { findPartnerName } from '../util-pairing/partner-name'
import { formatStartedOnInput, isValidStartedOn } from '../util-pairing/started-on-input'
import PairingLayout from './PairingLayout'

const MINUTE_MS = 60_000

const leave = () => {
  if (router.canGoBack()) router.back()
  else router.replace('/')
}

// SCR-02 4. 사귄 날 · 연결 완료 (설정 "사귄 날"에서도 같은 화면으로 고친다)
// TODO(1A): 날짜 선택기(@react-native-community/datetimepicker) 도입 전까지 숫자 입력(YYYY-MM-DD)
const StartedOnScreen = () => {
  const me = useMe()
  const couple = useCouple()
  const update = useUpdateStartedOn()
  const [value, setValue] = useState(couple.data?.startedOn ?? '')
  const [isBlockedVisible, setIsBlockedVisible] = useState(false)
  const now = useNow(MINUTE_MS)
  const isValid = isValidStartedOn(value, now)
  const title = `${me.data?.displayName ?? ''} · ${findPartnerName(couple.data, me.data?.id)}\n연결되었어요`

  const handleSubmit = () =>
    update.mutate(value, {
      onSuccess: leave,
      onError: (error) => setIsBlockedVisible(isApiErrorKind(error, 'COUPLE_UNLINKING')),
    })

  const hasGenericError = update.isError && !isApiErrorKind(update.error, 'COUPLE_UNLINKING')

  return (
    <PairingLayout
      hasBack={false}
      title={title}
      subtitle="마지막으로, 사귄 날을 알려주세요."
      footer={
        <>
          <Button label="시작하기" disabled={!isValid} isLoading={update.isPending} onPress={handleSubmit} />
          <Button label="나중에 입력할게요" variant="text" size="md" onPress={leave} />
        </>
      }
    >
      <View style={styles.avatars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.avatar, { backgroundColor: PHOTO_PLACEHOLDER[0] }]} />
        <View style={[styles.avatar, styles.overlap, { backgroundColor: PHOTO_PLACEHOLDER[1] }]} />
      </View>
      <TextField
        label="사귄 날"
        placeholder="2025-09-10"
        keyboardType="number-pad"
        value={value}
        onChangeText={(next) => setValue(formatStartedOnInput(next))}
        errorMessage={hasGenericError ? '저장하지 못했어요. 잠시 후 다시 시도해 주세요' : null}
      />
      <AppText variant="caption" color="ink3" style={styles.center}>
        사귄 날 기준으로 100일 단위와 매년 주년을 챙겨드려요
      </AppText>
      <UnlinkingBlockedSheet
        isVisible={isBlockedVisible}
        onClose={() => setIsBlockedVisible(false)}
        onOpenStatus={() => {
          setIsBlockedVisible(false)
          router.replace('/settings')
        }}
      />
    </PairingLayout>
  )
}

const styles = StyleSheet.create({
  avatars: { flexDirection: 'row', alignSelf: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: COLORS.bg },
  overlap: { marginLeft: -14 },
  center: { textAlign: 'center' },
})

export default StartedOnScreen
