import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'

type UnlinkingBlockedSheetProps = {
  isVisible: boolean
  onClose: () => void
  onOpenStatus: () => void
}

// SCR-18 유예 중 쓰기 시도(409) 시트
const UnlinkingBlockedSheet = ({ isVisible, onClose, onOpenStatus }: UnlinkingBlockedSheetProps) => (
  <BottomSheet isVisible={isVisible} onClose={onClose}>
    <View style={styles.icon}>
      <Icon name="lock" size={28} color="ink2" strokeWidth={1.6} />
    </View>
    <AppText variant="title" style={styles.center} accessibilityRole="header">
      지금은 새 기록을 남길 수 없어요
    </AppText>
    <AppText variant="label" color="ink2" style={styles.center}>
      연결 해제가 요청된 상태라 보기와 내보내기만 할 수 있어요. 다시 연결하면 기록을 이어갈 수 있어요.
    </AppText>
    <View style={styles.actions}>
      <Button label="닫기" variant="outline" onPress={onClose} style={styles.action} />
      <Button label="연결 상태 보기" onPress={onOpenStatus} style={styles.action} />
    </View>
  </BottomSheet>
)

const styles = StyleSheet.create({
  icon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: SPACING[2],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[2] },
  action: { flex: 1, height: 52 },
})

export default UnlinkingBlockedSheet
