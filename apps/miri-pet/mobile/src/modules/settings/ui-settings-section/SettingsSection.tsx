import type { ReactNode } from 'react'
import { Children, Fragment } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type SettingsSectionProps = { title: string; children: ReactNode }

// 디자인 19: 회색 바탕 위 제목 + 흰 카드 묶음, 행 사이 구분선
export const SettingsSection = ({ title, children }: SettingsSectionProps) => {
  const rows = Children.toArray(children)
  return (
    <View>
      <AppText variant="captionStrong" color="ink2" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  )
}

type SettingsRowProps = {
  label: string
  value?: string
  trailing?: ReactNode
  onPress?: () => void
  accessibilityRole?: 'button' | 'link'
}

export const SettingsRow = ({ label, value, trailing, onPress, accessibilityRole = 'button' }: SettingsRowProps) => {
  const content = (
    <>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="callout" color="ink3">
          {value}
        </AppText>
      ) : null}
      {trailing}
    </>
  )
  if (!onPress) return <View style={styles.row}>{content}</View>
  return (
    <Pressable accessibilityRole={accessibilityRole} onPress={onPress} style={styles.row}>
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: SPACING.xs, paddingBottom: SPACING.xs + 2, fontSize: 13 },
  card: { borderRadius: RADIUS.xl, backgroundColor: COLORS.surface, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: COLORS.divider },
  row: { minHeight: 52, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  label: { flex: 1 },
})
