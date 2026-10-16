import type { Vaccination } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Chip from '@/design-system/components/Chip'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useCertificates } from '../data-access-vaccinations/useVaccinations'
import { formatDotDate, vaccineLabel } from '../util-vaccination/vaccination-dates'

type CertificateViewerProps = {
  withCertificates: readonly Vaccination[]
  selectedId: string | null
  onSelect: (vaccinationId: string) => void
}

const MAX_ZOOM = 4

// 디자인 16 원본 보기: 60초 presigned URL로 증명서를 크게 보여준다(iOS는 두 손가락 확대)
const CertificateViewer = ({ withCertificates, selectedId, onSelect }: CertificateViewerProps) => {
  const certificates = useCertificates(selectedId)
  if (withCertificates.length === 0) {
    return (
      <AppText variant="callout" color="ink2" style={styles.center}>
        등록된 증명서가 없어요
      </AppText>
    )
  }
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {withCertificates.map((v) => (
          <Chip
            key={v.id}
            label={`${vaccineLabel(v.type, v.customName)} ${formatDotDate(v.administeredOn)}`}
            isSelected={v.id === selectedId}
            onPress={() => onSelect(v.id)}
          />
        ))}
      </ScrollView>
      {certificates.isError ? (
        <AppText variant="callout" color="danger" style={styles.center}>
          증명서를 불러오지 못했어요
        </AppText>
      ) : null}
      {certificates.isPending ? <ActivityIndicator color={COLORS.primary} /> : null}
      <ScrollView maximumZoomScale={MAX_ZOOM} minimumZoomScale={1} contentContainerStyle={styles.images}>
        {(certificates.data ?? []).map((certificate, index) => (
          <Image
            key={certificate.mediaId}
            accessibilityLabel={`증명서 원본 ${index + 1}`}
            source={{ uri: certificate.url, cacheKey: certificate.mediaId }}
            style={styles.image}
            contentFit="contain"
          />
        ))}
      </ScrollView>
      <AppText variant="caption" color="ink3" style={styles.center}>
        확대하려면 두 손가락으로 벌리세요
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: SPACING.md },
  chips: { gap: SPACING.sm },
  images: { gap: SPACING.md },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  center: { textAlign: 'center' },
})

export default CertificateViewer
