import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type OriginalSaveSheetProps = {
  isVisible: boolean
  isSaving: boolean
  onClose: () => void
  onSaveDisplay: () => void
  onSaveOriginal: () => void
}

// SCR-09 원본 저장 고지: "원본에는 촬영 위치가 포함됩니다" — 확인해야 원본 URL 을 받는다
const OriginalSaveSheet = ({ isVisible, isSaving, onClose, onSaveDisplay, onSaveOriginal }: OriginalSaveSheetProps) => (
  <BottomSheet isVisible={isVisible} onClose={onClose}>
    <AppText variant="heading" style={styles.title} accessibilityRole="header">
      원본을 저장할까요?
    </AppText>
    <View style={styles.notice}>
      <Icon name="map" size={20} color="ink2" />
      <AppText variant="label" color="ink2" style={styles.noticeText}>
        원본에는 촬영 위치와 시간이 포함돼요. 다른 사람에게 보낼 때는 화면용 사진을 공유하는 게 안전해요.
      </AppText>
    </View>
    <View style={styles.actions}>
      <Button label="화면용 저장" variant="outline" disabled={isSaving} onPress={onSaveDisplay} style={styles.action} />
      <Button
        label="원본으로 저장"
        isLoading={isSaving}
        onPress={onSaveOriginal}
        style={styles.action}
      />
    </View>
  </BottomSheet>
)

const styles = StyleSheet.create({
  title: { fontSize: 18 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  noticeText: { flex: 1 },
  actions: { flexDirection: 'row', gap: SPACING[2] },
  action: { flex: 1, height: 52 },
})

export default OriginalSaveSheet
