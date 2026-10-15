import { devLoginRequestSchema } from '@miri-pet/shared'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { session } from '@/shared/auth/session'
import { devLogin } from './dev-login-api'

const DEFAULT_NICKNAME = '개발자'

const loginWithNickname = async (nickname: string) => {
  const tokens = await devLogin({ nickname })
  await session.signIn({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
}

// 개발 전용: POST /auth/dev (닉네임만으로 로그인). 이후 화면 이동은 인증 게이트가 맡는다
const DevLoginPanel = () => {
  const [nickname, setNickname] = useState(DEFAULT_NICKNAME)
  const mutation = useMutation({ mutationFn: loginWithNickname })
  const isValid = devLoginRequestSchema.safeParse({ nickname: nickname.trim() }).success

  return (
    <View style={styles.panel}>
      <TextField testID="dev-login-nickname" label="개발용 닉네임" value={nickname} onChangeText={setNickname} autoCapitalize="none" />
      <Button
        testID="dev-login-submit"
        label="개발용 로그인"
        variant="dark"
        size="md"
        disabled={!isValid}
        isLoading={mutation.isPending}
        onPress={() => mutation.mutate(nickname.trim())}
      />
      {mutation.isError ? (
        <AppText variant="caption" color="danger">
          개발용 로그인 실패 — 서버 ENABLE_DEV_LOGIN을 확인하세요
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.borderStrong,
  },
})

export default DevLoginPanel
