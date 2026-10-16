import { Image } from 'expo-image'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Checkbox from '@/design-system/components/Checkbox'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'

type CertificateCaptureProps = {
  certificates: PickedImage[]
  canAdd: boolean
  hasConsent: boolean
  errorMessage?: string
  onCapture: () => void
  onRemove: (index: number) => void
  onToggleConsent: () => void
}

const THUMB = 64

// 디자인 15 상단: 증명서 촬영 + 비공개 안내 + [필수] 보관 동의 (사진이 있을 때만)
const CertificateCapture = ({
  certificates,
  canAdd,
  hasConsent,
  errorMessage,
  onCapture,
  onRemove,
  onToggleConsent,
}: CertificateCaptureProps) => (
  <View style={styles.box}>
    <View style={styles.row}>
      {certificates.map((image, index) => (
        <Pressable
          key={image.uri}
          accessibilityRole="button"
          accessibilityLabel={`증명서 사진 ${index + 1}`}
          accessibilityHint="누르면 이 사진을 뺍니다"
          onPress={() => onRemove(index)}
        >
          <Image source={{ uri: image.uri }} style={styles.thumb} contentFit="cover" />
        </Pressable>
      ))}
      {canAdd ? (
        <Pressable accessibilityRole="button" accessibilityLabel="증명서 촬영" onPress={onCapture} style={styles.add}>
          <Icon name="plus" color="primary" />
          <AppText variant="captionStrong" color="primary">
            증명서 촬영
          </AppText>
        </Pressable>
      ) : null}
    </View>
    <AppText variant="calloutStrong">나만 볼 수 있어요</AppText>
    <AppText variant="caption" color="ink2">
      증명서 사진은 비공개로 보관되고, 탈퇴하면 함께 지워져요.
    </AppText>
    {certificates.length > 0 ? (
      <Checkbox label="[필수] 증명서 사진 보관 동의" isChecked={hasConsent} onToggle={onToggleConsent} />
    ) : null}
    {errorMessage ? (
      <AppText variant="caption" color="danger">
        {errorMessage}
      </AppText>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  box: {
    gap: SPACING.xs + 2,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primarySoft,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  thumb: { width: THUMB, height: THUMB, borderRadius: RADIUS.md },
  add: {
    width: THUMB + SPACING.xxxl,
    height: THUMB,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxs,
  },
})

export default CertificateCapture
