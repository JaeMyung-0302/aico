import { StyleSheet, View } from 'react-native'
import { COLORS } from '@/design-system/tokens/colors'

// 디자인 01 로고: 파란 얼굴 + 노란 귀 + 흰 눈
const BrandMark = () => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.wrap}>
    <View style={[styles.ear, styles.earLeft]} />
    <View style={[styles.ear, styles.earRight]} />
    <View style={styles.face} />
    <View style={[styles.eye, { left: 30 }]} />
    <View style={[styles.eye, { left: 62 }]} />
  </View>
)

const styles = StyleSheet.create({
  wrap: { width: 112, height: 112 },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 56,
    backgroundColor: COLORS.primary,
  },
  ear: {
    position: 'absolute',
    top: 6,
    width: 34,
    height: 44,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: COLORS.warm,
  },
  earLeft: { left: -6, transform: [{ rotate: '-24deg' }] },
  earRight: { right: -6, transform: [{ rotate: '24deg' }] },
  eye: { position: 'absolute', top: 40, width: 14, height: 18, borderRadius: 7, backgroundColor: COLORS.surface },
})

export default BrandMark
