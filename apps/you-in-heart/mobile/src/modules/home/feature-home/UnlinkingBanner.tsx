import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { formatKstDotDate } from '@/modules/settings/feature-unlink/unlink-dates'

// SCR-03 연결 해제 유예 중(읽기 전용) 배너. TODO(2C): "내보내기" 버튼
const UnlinkingBanner = ({ purgeAfter }: { purgeAfter: string | null }) => (
  <View accessibilityRole="summary" style={styles.banner}>
    <AppText variant="bodyStrong" color="bg">
      연결 해제가 요청되었어요
    </AppText>
    <AppText variant="caption" color="line">
      {purgeAfter ? `${formatKstDotDate(purgeAfter)}에 모든 기록이 삭제돼요. ` : ''}그 전까지 보기와 내보내기만 할 수
      있어요.
    </AppText>
    <Button
      label="다시 연결하기"
      variant="dark"
      size="md"
      onPress={() => router.push('/settings')}
      style={styles.button}
    />
  </View>
)

const styles = StyleSheet.create({
  banner: { gap: 10, padding: 18, borderRadius: RADIUS.lg, backgroundColor: COLORS.ink },
  button: { alignSelf: 'flex-start', height: 40, borderWidth: 1, borderColor: COLORS.ink2, marginTop: SPACING[1] },
})

export default UnlinkingBanner
