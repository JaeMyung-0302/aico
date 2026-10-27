import { Pressable, ScrollView, StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'

// 전체 / 보낸 사람(두 사람 이름) / 스크린샷
export type QuoteFilter = { kind: 'all' } | { kind: 'speaker'; name: string } | { kind: 'screenshot' }

type QuoteFilterChipsProps = { names: readonly string[]; value: QuoteFilter; onChange: (next: QuoteFilter) => void }

const isSame = (a: QuoteFilter, b: QuoteFilter): boolean =>
  a.kind === b.kind && (a.kind !== 'speaker' || (b.kind === 'speaker' && a.name === b.name))

const Chip = ({ label, isOn, onPress }: { label: string; isOn: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: isOn }}
    onPress={onPress}
    style={[styles.chip, isOn ? styles.chipOn : null]}
  >
    <AppText variant={isOn ? 'captionStrong' : 'caption'} color={isOn ? 'bg' : 'ink'}>
      {label}
    </AppText>
  </Pressable>
)

// SCR-13 거르기 칩 (선택 칩은 진한 바탕)
const QuoteFilterChips = ({ names, value, onChange }: QuoteFilterChipsProps) => {
  const options: { label: string; filter: QuoteFilter }[] = [
    { label: '전체', filter: { kind: 'all' } },
    ...names.map((name) => ({ label: name, filter: { kind: 'speaker' as const, name } })),
    { label: '스크린샷', filter: { kind: 'screenshot' } },
  ]
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map(({ label, filter }) => (
        <Chip key={label} label={label} isOn={isSame(filter, value)} onPress={() => onChange(filter)} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  chipOn: { backgroundColor: COLORS.ink },
})

export default QuoteFilterChips
