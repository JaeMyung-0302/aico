import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { TOUCH_TARGET } from '@/design-system/tokens/spacing'

// SCR-03 상단 "재명 · 지은" + 설정
const HomeHeader = ({ title }: { title: string }) => (
  <View style={styles.header}>
    <AppText variant="body" color="ink2">
      {title}
    </AppText>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="설정"
      onPress={() => router.push('/settings')}
      style={styles.settings}
    >
      <Icon name="settings" color="ink2" />
    </Pressable>
  </View>
)

const styles = StyleSheet.create({
  header: { height: TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settings: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
})

export default HomeHeader
