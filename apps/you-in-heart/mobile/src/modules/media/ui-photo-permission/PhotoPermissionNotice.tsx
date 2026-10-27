import { Linking, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

// SCR-05·08 사진 권한 거부: 설정 앱으로 보낸다(다시 물을 수 없는 상태)
const PhotoPermissionNotice = () => (
  <View style={styles.box}>
    <Icon name="image" size={28} color="ink2" strokeWidth={1.6} />
    <AppText variant="bodyStrong">사진에 접근할 수 없어요</AppText>
    <AppText variant="caption" color="ink2" style={styles.center}>
      {'설정에서 사진 접근을 허용하면\n추억에 사진을 담을 수 있어요.'}
    </AppText>
    <Button
      label="설정 열기"
      variant="outline"
      size="md"
      onPress={() => {
        Linking.openSettings().catch(() => undefined)
      }}
    />
  </View>
)

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  center: { textAlign: 'center' },
})

export default PhotoPermissionNotice
