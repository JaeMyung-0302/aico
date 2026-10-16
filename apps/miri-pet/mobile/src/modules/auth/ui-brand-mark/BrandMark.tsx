import { Image } from 'expo-image'
import { StyleSheet } from 'react-native'
import { RADIUS } from '@/design-system/tokens/radius'

const BRAND_MARK = require('../../../../assets/images/brand-mark.png')

// 디자인 01 로고: 앱 아이콘과 같은 강아지 얼굴
const BrandMark = () => (
  <Image
    source={BRAND_MARK}
    style={styles.mark}
    contentFit="cover"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  />
)

const styles = StyleSheet.create({
  mark: { width: 112, height: 112, borderRadius: RADIUS.sheet },
})

export default BrandMark
