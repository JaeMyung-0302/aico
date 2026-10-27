import type { BucketItem } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'

type BucketItemRowProps = {
  item: BucketItem
  isLast: boolean
  onToggle: () => void
  onLongPress: () => void
}

// 완료한 달 "2026. 05" (KST)
const doneMonth = (doneAt: string): string => {
  const kst = new Date(Date.parse(doneAt) + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}. ${String(kst.getUTCMonth() + 1).padStart(2, '0')}`
}

// SCR-12 항목 행: 동그란 체크(누르면 완료/완료 취소, 길게 누르면 삭제), 완료 항목은 취소선 + 기록 보기·완료 달
const BucketItemRow = ({ item, isLast, onToggle, onLongPress }: BucketItemRowProps) => {
  const isDone = item.doneAt !== null
  return (
    <View style={[styles.row, isLast ? null : styles.divider]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={item.title}
        accessibilityState={{ checked: isDone }}
        accessibilityHint="길게 누르면 지울 수 있어요"
        onPress={onToggle}
        onLongPress={onLongPress}
        style={styles.main}
      >
        <View style={[styles.check, isDone ? styles.checkOn : null]}>
          {isDone ? <Icon name="check" size={14} color="bg" strokeWidth={3} /> : null}
        </View>
        <AppText color={isDone ? 'ink3' : 'ink'} style={[styles.title, isDone ? styles.struck : null]}>
          {item.title}
        </AppText>
      </Pressable>
      {isDone && item.entryId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="기록 보기"
          onPress={() => router.push(`/diary/${item.entryId}`)}
          style={styles.link}
        >
          <AppText variant="micro" color="accent" style={styles.meta}>
            기록 보기
          </AppText>
        </Pressable>
      ) : null}
      {isDone && !item.entryId && item.doneAt ? (
        <AppText variant="micro" color="ink3" style={styles.meta}>
          {doneMonth(item.doneAt)}
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], minHeight: 56 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  title: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  link: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  meta: { fontSize: 12 },
})

export default BucketItemRow
