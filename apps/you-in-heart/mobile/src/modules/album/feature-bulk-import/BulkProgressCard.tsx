import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import type { BulkProgress } from './useBulkProgress'

const formatCount = (value: number): string => value.toLocaleString('ko-KR')

// SCR-08 "올리는 중 856 / 2,140" 카드
const BulkProgressCard = ({ progress }: { progress: BulkProgress }) => {
  const ratio = progress.total === 0 ? 0 : progress.done / progress.total
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <AppText variant="labelStrong">{progress.isPaused ? '일시정지됨' : '올리는 중'}</AppText>
        <AppText variant="label" color="ink2">{`${formatCount(progress.done)} / ${formatCount(progress.total)}`}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
      <AppText variant="micro" color="ink2" style={styles.caption}>
        앱을 닫으면 멈췄다가, 다시 열면 이어서 올라가요.
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 18, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  bar: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  caption: { fontSize: 12, lineHeight: 19 },
})

export default BulkProgressCard
