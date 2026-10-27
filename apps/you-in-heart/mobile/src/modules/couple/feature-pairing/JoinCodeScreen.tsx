import { inviteCodeSchema } from '@you-in-heart/shared'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useJoinCouple } from '../data-access-couple/useJoinCouple'
import CodeCells from '../ui-code-cells/CodeCells'
import { normalizeInviteCodeInput, toJoinErrorMessage } from '../util-pairing/pairing-messages'
import PairingLayout from './PairingLayout'

// SCR-02 3. 코드 입력 · 오류. 연결되면 인증 게이트가 탭으로 보낸다(사귄 날은 홈 카드에서 입력)
const JoinCodeScreen = () => {
  const join = useJoinCouple()
  const [code, setCode] = useState('')
  const isComplete = inviteCodeSchema.safeParse(code).success
  const errorMessage = join.isError ? toJoinErrorMessage(join.error) : null

  const handleChangeCode = (value: string) => {
    if (join.isError) join.reset()
    setCode(normalizeInviteCodeInput(value))
  }

  return (
    <PairingLayout
      title={'받은 코드를\n입력해 주세요'}
      subtitle="6자리 영문과 숫자예요."
      footer={
        <Button label="연결하기" disabled={!isComplete} isLoading={join.isPending} onPress={() => join.mutate(code)} />
      }
    >
      <View style={styles.codeBlock}>
        <CodeCells code={code} hasError={errorMessage !== null} onChangeCode={handleChangeCode} />
        {errorMessage ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {errorMessage}
          </AppText>
        ) : null}
      </View>
      <View style={styles.notice}>
        <AppText variant="captionStrong">여러 번 틀리면</AppText>
        <AppText variant="caption" color="ink2">
          5번 틀리면 10분 동안 입력할 수 없어요. 코드가 만료됐다면 상대에게 새 코드를 요청해 주세요.
        </AppText>
      </View>
    </PairingLayout>
  )
}

const styles = StyleSheet.create({
  codeBlock: { gap: 10 },
  notice: {
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
})

export default JoinCodeScreen
