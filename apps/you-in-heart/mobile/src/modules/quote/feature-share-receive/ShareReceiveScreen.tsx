import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { useMe } from '@/modules/user/data-access-me/useMe'
import ScreenshotSaveSheet from '../feature-screenshot-save/ScreenshotSaveSheet'
import { pendingShare } from '../util-share/pending-share'
import ShareTextForm from './ShareTextForm'

// 저장·취소하면 기억해 둔 공유를 비우고 보관함으로 간다
const finish = () => {
  router.replace('/quotes')
  pendingShare.getState().clear()
}

// SCR-14 미연결 상태: 공유는 기억해 두고(메모리) 페어링으로 보낸다. 연결되면 useShareRouting 이 다시 연다
const UnpairedState = () => (
  <View style={styles.center}>
    <AppText variant="title" accessibilityRole="header" style={styles.textCenter}>
      먼저 상대와 연결해 주세요
    </AppText>
    <AppText variant="label" color="ink2" style={styles.textCenter}>
      받은 문구는 잠시 기억해 둘게요. 연결을 마치면 바로 저장할 수 있어요.
    </AppText>
    <Button label="연결하러 가기" onPress={() => router.replace('/pairing')} style={styles.cta} />
  </View>
)

// SCR-14 공유로 받기: 텍스트 = 문구 저장 폼, 이미지 = 스크린샷 시트(SCR-13), .txt = 가져오기 화면으로 넘긴다
const ShareReceiveScreen = () => {
  const payload = pendingShare((state) => state.payload)
  const me = useMe()
  const hasCouple = Boolean(me.data?.couple)
  const couple = useCouple({ isEnabled: hasCouple })
  // 열 때 받은 공유가 없었으면(직접 들어옴) 보관함으로. 저장 후 비울 때는 finish 가 이미 보낸다
  const [isEmptyOnOpen] = useState(() => pendingShare.getState().payload === null)
  const isTxt = hasCouple && payload?.kind === 'txt-file'

  useEffect(() => {
    if (isEmptyOnOpen) router.replace('/quotes')
  }, [isEmptyOnOpen])

  useEffect(() => {
    if (isTxt) router.replace('/quotes/import')
  }, [isTxt])

  if (!payload || isTxt || !me.data) return <View style={styles.screen} />

  if (!hasCouple) {
    return (
      <View style={styles.screen}>
        <AppHeader title="공유로 받기" />
        <UnpairedState />
      </View>
    )
  }

  if (payload.kind === 'image') {
    return (
      <View style={styles.screen}>
        <AppHeader title="공유로 받기" onBackPress={finish} />
        <ScreenshotSaveSheet isVisible initialUri={payload.uri} onClose={finish} onSaved={finish} />
      </View>
    )
  }

  // 보낸 사람 기본값(상대 이름)이 정해진 뒤에 폼을 연다
  if (couple.isPending) return <View style={styles.screen} />
  const partnerName = couple.data?.members.find((member) => member.userId !== me.data?.id)?.displayName ?? null
  return (
    <View style={styles.screen}>
      <AppHeader title="공유로 받기" onBackPress={finish} />
      {payload.kind === 'text' ? (
        <ShareTextForm
          text={payload.text}
          myName={me.data.displayName}
          partnerName={partnerName}
          onSaved={finish}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[3], paddingHorizontal: 40 },
  textCenter: { textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: SPACING[3] },
})

export default ShareReceiveScreen
