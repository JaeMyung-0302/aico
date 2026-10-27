import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon, { type IconName } from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useBucketItems } from '@/modules/bucket/data-access-bucket/useBucket'

const Shortcut = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.shortcut}>
    <Icon name={icon} size={18} color="accent" />
    <AppText variant="labelStrong">{label}</AppText>
  </Pressable>
)

// SCR-03 바로가기 2칸: 버킷리스트(완료/전체), 문구 보관함
const HomeShortcuts = () => {
  const bucket = useBucketItems()
  const items = bucket.data ?? []
  const done = items.filter((item) => item.doneAt !== null).length
  return (
    <View style={styles.row}>
      <Shortcut
        icon="check"
        label={bucket.data ? `버킷리스트 ${done}/${items.length}` : '버킷리스트'}
        onPress={() => router.push('/bucket')}
      />
      <Shortcut icon="quote" label="문구 보관함" onPress={() => router.push('/quotes')} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING[2] },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    height: 52,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
})

export default HomeShortcuts
