import type { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'

type DialogProps = {
  isVisible: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  // 하단 버튼들 (2개면 가로 2열)
  actions: ReactNode
}

// 화면 가운데 확인 창 (디자인 19 탈퇴 확인)
const Dialog = ({ isVisible, onClose, title, description, children, actions }: DialogProps) => (
  <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      <View accessibilityViewIsModal style={styles.card}>
        <AppText variant="title3" accessibilityRole="header">
          {title}
        </AppText>
        {description ? (
          <AppText variant="callout" color="ink2">
            {description}
          </AppText>
        ) : null}
        {children}
        <View style={styles.actions}>{actions}</View>
      </View>
    </View>
  </Modal>
)

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.scrim,
  },
  card: {
    alignSelf: 'stretch',
    gap: SPACING.sm + 2,
    paddingTop: SPACING.xl + 2,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.surface,
  },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
})

export default Dialog
