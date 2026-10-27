import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'

type PairingLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  // 하단 고정 버튼들
  footer: ReactNode
  hasBack?: boolean
  onBackPress?: () => void
}

// SCR-02 공통 틀: 뒤로 + 세리프 제목·보조 문구 + 본문(간격 32) + 하단 버튼(아래 여백 48)
const PairingLayout = ({ title, subtitle, children, footer, hasBack = true, onBackPress }: PairingLayoutProps) => {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.screen}>
      {hasBack ? <AppHeader onBackPress={onBackPress} /> : <View style={{ height: insets.top + SPACING[12] }} />}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="label" color="ink2">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING[4]) + SPACING[8] }]}>{footer}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingTop: SPACING[4], paddingHorizontal: SPACING.screen, gap: SPACING[8] },
  heading: { gap: SPACING[2] },
  footer: { paddingHorizontal: SPACING.screen, gap: SPACING[3] },
})

export default PairingLayout
