import { computeDday } from '@you-in-heart/shared'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'

// SCR-03 "함께한 지 413일 / 2025. 09. 10부터" (세리프 display). 사귄 날 당일 = 1일
const DdayBlock = ({ startedOn, nowMs }: { startedOn: string; nowMs: number }) => {
  const { days } = computeDday(startedOn, nowMs)
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="ink3">
        함께한 지
      </AppText>
      <AppText variant="display" style={styles.days} accessibilityLabel={`함께한 지 ${days}일`}>
        {String(days)}
        <AppText variant="title" style={styles.unit}>
          일
        </AppText>
      </AppText>
      <AppText variant="caption" color="ink3">
        {`${formatDotDate(startedOn)}부터`}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4, paddingTop: 8, paddingBottom: 4 },
  days: { letterSpacing: -1 },
  unit: { fontSize: 28 },
})

export default DdayBlock
