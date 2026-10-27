import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import type { UploadSummary } from './upload-summary'

type UploadStatusCardProps = {
  summary: UploadSummary
  onRetryPress: () => void
}

// SCR-05 "업로드 중 · 일부 실패": 진행 막대(올라간 장수 / 전체) + 실패 안내(다시 올리기) + 이어 올리기 안내
const UploadStatusCard = ({ summary, onRetryPress }: UploadStatusCardProps) => (
  <View style={styles.wrap}>
    <View style={styles.progress}>
      <View style={styles.progressRow}>
        <AppText variant="caption">사진 올리는 중</AppText>
        <AppText variant="caption" color="ink2">{`${summary.done} / ${summary.total}`}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.round(summary.progress * 100)}%` }]} />
      </View>
    </View>
    {summary.failed > 0 && summary.pending === 0 ? (
      <View accessibilityRole="alert" style={styles.alert}>
        <Icon name="alert" size={20} color="danger" />
        <View style={styles.alertBody}>
          <AppText variant="labelStrong">{`사진 ${summary.failed}장을 올리지 못했어요`}</AppText>
          <AppText variant="caption" color="ink2">
            {summary.retryable > 0
              ? '글과 다른 사진은 저장됐어요. 연결이 좋아지면 다시 올려 주세요.'
              : '한 기록에 담을 수 있는 장수를 넘었거나, 기기에서 사진을 찾을 수 없어요.'}
          </AppText>
          {summary.retryable > 0 ? (
            <Button label="다시 올리기" variant="outline" size="md" onPress={onRetryPress} style={styles.retry} />
          ) : null}
        </View>
      </View>
    ) : null}
    <AppText variant="micro" color="ink3" style={styles.footnote}>
      앱을 닫아도 남은 사진은 이어서 올라가요. 원본은 그대로 보관돼요.
    </AppText>
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  progress: { gap: SPACING[2] },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  bar: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  alert: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  alertBody: { flex: 1, gap: 6 },
  retry: { alignSelf: 'flex-start', height: 36, paddingHorizontal: 14 },
  footnote: { fontSize: 12, lineHeight: 19 },
})

export default UploadStatusCard
