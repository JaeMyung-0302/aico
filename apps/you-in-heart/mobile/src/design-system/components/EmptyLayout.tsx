import { StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'
import Button from './Button'
import Icon, { type IconName } from './Icon'

type EmptyLayoutProps = {
  title: string
  description?: string
  icon?: IconName
  // 불러오기 실패(SCR-18 서버 오류): 있으면 "다시 시도" 버튼을 보여준다
  onRetry?: () => void
  // 다른 이동 버튼 (예: SCR-18 404 "타임라인으로")
  action?: { label: string; onPress: () => void }
  // 오류 코드·요청 ID 같은 작은 보조 문구
  footnote?: string
}

// SCR-18 빈 상태·오류 공통 레이아웃: 회색 원 아이콘 + 세리프 제목 + 설명 + 테두리 버튼
const EmptyLayout = ({ title, description, icon, onRetry, action, footnote }: EmptyLayoutProps) => (
  <View style={styles.wrap}>
    {icon ? (
      <View style={styles.icon}>
        <Icon name={icon} size={28} color="ink2" strokeWidth={1.6} />
      </View>
    ) : null}
    <AppText variant="title" style={styles.center} accessibilityRole="header">
      {title}
    </AppText>
    {description ? (
      <AppText variant="label" color="ink2" style={styles.center}>
        {description}
      </AppText>
    ) : null}
    {onRetry ? <Button label="다시 시도" variant="outline" size="md" onPress={onRetry} style={styles.button} /> : null}
    {action ? (
      <Button label={action.label} variant="outline" size="md" onPress={action.onPress} style={styles.button} />
    ) : null}
    {footnote ? (
      <AppText variant="micro" color="ink3">
        {footnote}
      </AppText>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
    paddingHorizontal: 40,
    paddingBottom: 80,
    backgroundColor: COLORS.bg,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: COLORS.surface,
  },
  center: { textAlign: 'center' },
  button: { marginTop: SPACING[2] },
})

export default EmptyLayout
