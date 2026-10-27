import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'

// SCR-03 사귄 날 미입력 카드 → SCR-02 4. 사귄 날
const StartedOnPrompt = () => (
  <View style={styles.card}>
    <AppText variant="title">{'우리가 처음 만난 날,\n언제였나요?'}</AppText>
    <AppText variant="caption" color="ink2">
      {'사귄 날을 알려주시면 D-day와\n100일·주년 기념일을 챙겨드릴게요.'}
    </AppText>
    <Button
      label="사귄 날 입력하기"
      size="md"
      onPress={() => router.push('/pairing/started-on')}
      style={styles.button}
    />
  </View>
)

const styles = StyleSheet.create({
  card: {
    gap: SPACING[3],
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
    alignItems: 'flex-start',
  },
  button: { marginTop: SPACING[1] },
})

export default StartedOnPrompt
