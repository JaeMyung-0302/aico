import type { AnniversaryItem } from '@you-in-heart/shared'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'
import AnniversaryRow from '../ui-anniversary-row/AnniversaryRow'
import {
  formatWeekdayDate,
  formatYearlyDate,
  groupAnniversaries,
  toCountdownLabel,
} from '../util-anniversary/anniversary-view'

type AnniversaryListProps = {
  items: readonly AnniversaryItem[]
  nowMs: number
  hasStartedOn: boolean
  // 없으면 읽기 전용(연결 해제 유예 중)
  onEditCustom?: (item: AnniversaryItem) => void
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View accessibilityLabel={title}>
    <AppText variant="captionStrong" color="ink3" style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </AppText>
    {children}
  </View>
)

const Hint = ({ text }: { text: string }) => (
  <AppText variant="label" color="ink3" style={styles.hint}>
    {text}
  </AppText>
)

// SCR-04 세 구역. 가장 가까운 다가오는 기념일만 포인트 색
const AnniversaryList = ({ items, nowMs, hasStartedOn, onEditCustom }: AnniversaryListProps) => {
  const { upcoming, customs, past } = groupAnniversaries(items, nowMs)
  return (
    <>
      <Section title="다가오는 기념일">
        {upcoming.length === 0 ? (
          <Hint
            text={hasStartedOn ? '1년 안에 다가오는 기념일이 없어요' : '사귄 날을 입력하면 100일·주년을 챙겨드려요'}
          />
        ) : null}
        {upcoming.map((item, index) => (
          <AnniversaryRow
            key={item.refKey}
            title={item.title}
            dateLabel={formatWeekdayDate(item.date)}
            countdown={toCountdownLabel(item.date, nowMs)}
            isHighlighted={index === 0}
            isLast={index === upcoming.length - 1}
          />
        ))}
      </Section>
      <Section title="우리가 정한 날">
        {customs.length === 0 ? <Hint text="생일처럼 둘만의 날을 추가해 보세요" /> : null}
        {customs.map((item, index) => (
          <AnniversaryRow
            key={item.refKey}
            title={item.title}
            dateLabel={formatYearlyDate(item.date)}
            countdown={toCountdownLabel(item.date, nowMs)}
            isLast={index === customs.length - 1}
            onPress={onEditCustom ? () => onEditCustom(item) : undefined}
          />
        ))}
      </Section>
      {past.length > 0 ? (
        <Section title="지난 기념일">
          {past.map((item, index) => (
            <AnniversaryRow
              key={`${item.refKey}:${item.date}`}
              title={item.title}
              dateLabel={formatDotDate(item.date)}
              isPast
              isLast={index === past.length - 1}
            />
          ))}
        </Section>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { paddingTop: 20, paddingBottom: 4, letterSpacing: 0.5, fontSize: 12 },
  hint: { paddingVertical: 16 },
})

export default AnniversaryList
