import { router } from 'expo-router'
import { type ReactNode, useEffect } from 'react'
import { Share, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useNow } from '@/shared/hooks/use-now'
import { useCreateInvite } from '../data-access-couple/useCreateInvite'
import CodeCells from '../ui-code-cells/CodeCells'
import PairingLayout from './PairingLayout'
import { formatInviteRemaining } from '../util-pairing/format-invite-remaining'

const TICK_MS = 30_000
// 상대가 코드를 입력하면 /me 에 커플이 생기고 인증 게이트가 탭으로 보낸다
const PARTNER_POLL_MS = 5_000

// 스택에 이 화면뿐이면(이름이 있는 미연결 사용자의 첫 화면) 프로필(초대·입력 선택)로 돌아간다
const handleBackPress = () => {
  if (router.canGoBack()) router.back()
  else router.replace('/onboarding/profile')
}

const shareCode = (code: string) => {
  // TODO(1A): 카카오 공유 SDK(@react-native-kakao/share) 전까지 OS 공유 시트로 보낸다(카카오톡 선택)
  Share.share({ message: `You-In-Heart 초대 코드: ${code}\n앱에서 "받은 코드 입력하기"에 넣어 주세요.` }).catch(
    () => undefined,
  )
}

// SCR-02 2. 초대 코드 공유
const InviteCodeScreen = () => {
  const invite = useCreateInvite()
  const now = useNow(TICK_MS)
  useMe({ pollIntervalMs: PARTNER_POLL_MS })
  const { mutate } = invite

  useEffect(() => {
    mutate()
  }, [mutate])

  const code = invite.data?.code ?? ''
  const remaining = invite.data ? formatInviteRemaining(invite.data.expiresAt, now) : null
  const isExpired = invite.data !== undefined && remaining === null

  return (
    <PairingLayoutWithFooter code={code} isExpired={isExpired} onRenew={() => mutate()}>
      <View style={styles.codeBlock}>
        <CodeCells code={code} />
        <AppText variant="caption" color={invite.isError ? 'danger' : 'ink3'} style={styles.center}>
          {describeInviteState({ isError: invite.isError, isExpired, remaining })}
        </AppText>
      </View>
      <View style={styles.waiting}>
        <View style={styles.dot} />
        <AppText variant="caption" color="ink2">
          상대가 입력하기를 기다리는 중
        </AppText>
      </View>
    </PairingLayoutWithFooter>
  )
}

const describeInviteState = (state: { isError: boolean; isExpired: boolean; remaining: string | null }): string => {
  if (state.isError) return '코드를 만들지 못했어요. 다시 시도해 주세요'
  if (state.isExpired) return '코드가 만료됐어요. 새 코드를 만들어 주세요'
  return state.remaining ?? '코드를 만드는 중이에요'
}

type FooterProps = { code: string; isExpired: boolean; onRenew: () => void; children: ReactNode }

const PairingLayoutWithFooter = ({ code, isExpired, onRenew, children }: FooterProps) => (
  <PairingLayout
    title={'이 코드를 상대에게\n보내 주세요'}
    subtitle="상대가 코드를 입력하면 둘의 공간이 열려요."
    onBackPress={handleBackPress}
    footer={
      <>
        {isExpired || code === '' ? (
          <Button label="새 코드 만들기" onPress={onRenew} />
        ) : (
          <Button
            label="카카오톡으로 보내기"
            leading={<Icon name="share" size={20} color="bg" strokeWidth={1.8} />}
            onPress={() => shareCode(code)}
          />
        )}
        <Button label="받은 코드 입력하기" variant="outline" onPress={() => router.push('/pairing/join')} />
      </>
    }
  >
    {children}
  </PairingLayout>
)

const styles = StyleSheet.create({
  codeBlock: { gap: SPACING[3] },
  center: { textAlign: 'center' },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
})

export default InviteCodeScreen
