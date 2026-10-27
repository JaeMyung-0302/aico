import type { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'

type BottomSheetProps = {
  isVisible: boolean
  onClose: () => void
  children: ReactNode
}

// SCR-18 409 시트 모양: 위 모서리 24, 손잡이 36×4, 좌우 24
const BottomSheet = ({ isVisible, onClose, children }: BottomSheetProps) => {
  const insets = useSafeAreaInsets()
  return (
    <Modal transparent visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="닫기" style={styles.scrim} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + SPACING[6] }]}>
        <View style={styles.handle} />
        {children}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: COLORS.scrim },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING[3],
    gap: 14,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.line },
})

export default BottomSheet
