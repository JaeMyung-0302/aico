import { toKstDate } from '@you-in-heart/shared'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'

type MonthJumpSheetProps = {
  isVisible: boolean
  // 지금 보고 있는 달 'YYYY-MM'
  selectedMonth: string | null
  nowMs: number
  onClose: () => void
  onSelect: (year: number, month: number) => void
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

const parseYearMonth = (value: string): { year: number; month: number } => ({
  year: Number(value.slice(0, 4)),
  month: Number(value.slice(5, 7)),
})

// SCR-07 월 이동 시트: 해 넘기기 + 12달 격자. 앞으로의 달(KST)은 고를 수 없다
const MonthJumpSheet = ({ isVisible, selectedMonth, nowMs, onClose, onSelect }: MonthJumpSheetProps) => {
  const today = parseYearMonth(toKstDate(nowMs))
  const selected = selectedMonth ? parseYearMonth(selectedMonth) : today
  const [year, setYear] = useState(selected.year)
  const isNextYearDisabled = year >= today.year

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <View style={styles.yearRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 해" onPress={() => setYear(year - 1)} style={styles.icon}>
          <Icon name="back" />
        </Pressable>
        <AppText variant="title" style={styles.year}>
          {String(year)}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 해"
          accessibilityState={{ disabled: isNextYearDisabled }}
          disabled={isNextYearDisabled}
          onPress={() => setYear(year + 1)}
          style={styles.icon}
        >
          <Icon name="chevronRight" color={isNextYearDisabled ? 'line' : 'ink'} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {MONTHS.map((month) => {
          const isFuture = year > today.year || (year === today.year && month > today.month)
          const isSelected = year === selected.year && month === selected.month
          return (
            <Pressable
              key={month}
              accessibilityRole="button"
              accessibilityLabel={`${month}월`}
              accessibilityState={{ disabled: isFuture, selected: isSelected }}
              disabled={isFuture}
              onPress={() => onSelect(year, month)}
              style={[styles.cell, isSelected ? styles.cellOn : null, isFuture ? styles.cellOff : null]}
            >
              <AppText
                variant={isSelected ? 'labelStrong' : 'label'}
                color={isSelected ? 'bg' : isFuture ? 'ink3' : 'ink'}
              >{`${month}월`}</AppText>
            </Pressable>
          )
        })}
      </View>
      <AppText variant="micro" color="ink3" style={styles.caption}>
        고른 달부터 지난 기록을 보여줘요
      </AppText>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  year: { fontSize: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  cell: {
    width: '23%',
    flexGrow: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  cellOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  cellOff: { backgroundColor: COLORS.surface, borderColor: COLORS.surface },
  caption: { fontSize: 12 },
})

export default MonthJumpSheet
