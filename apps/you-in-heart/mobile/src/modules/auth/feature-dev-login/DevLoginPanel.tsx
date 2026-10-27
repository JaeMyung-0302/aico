import { devLoginRequestSchema } from '@you-in-heart/shared'
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

const DEFAULT_DEV_KEY = 'dev-a'

const loginWithDevKey = async (devKey: string) => {
  const tokens = await devLogin({ devKey })
  await session.signIn({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
}

// 개발 전용: POST /auth/dev-login. 이후 화면 이동은 인증 게이트가 맡는다
const DevLoginPanel = () => {
  const [devKey, setDevKey] = useState(DEFAULT_DEV_KEY)
  const mutation = useMutation({ mutationFn: loginWithDevKey })
  const isValid = devLoginRequestSchema.safeParse({ devKey: devKey.trim() }).success

  return (
    <View style={styles.panel}>
      <TextField label="개발용 계정 키" value={devKey} onChangeText={setDevKey} autoCapitalize="none" />
      <Button
        label="개발용 로그인"
        variant="dark"
        size="md"
        disabled={!isValid}
        isLoading={mutation.isPending}
        onPress={() => mutation.mutate(devKey.trim())}
      />
      {mutation.isError ? (
        <AppText variant="caption" color="danger">
          개발용 로그인 실패 — 서버 DEV_LOGIN_ENABLED를 확인하세요
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    gap: SPACING[2],
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
  },
})

export default DevLoginPanel
