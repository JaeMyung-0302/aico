import type { PostPlace } from '@miri-pet/shared'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'

type PlaceTagRowProps = {
  place: PostPlace | null
  onPress: () => void
  onClear: () => void
}

// 06 장소 태그(선택) 행: 누르면 장소 선택 시트, 고른 장소는 오른쪽에 표시 + 빼기
const PlaceTagRow = ({ place, onPress, onClear }: PlaceTagRowProps) => (
  <View style={styles.row}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={place ? `장소 태그: ${place.name}` : '장소 태그 (선택)'}
      onPress={onPress}
      style={styles.main}
    >
      <Icon name="pin" size={20} color="ink2" />
      <AppText variant="body" style={styles.label}>
        장소 태그 <AppText variant="body" color="ink3">(선택)</AppText>
      </AppText>
      {place ? (
        <AppText variant="calloutStrong" color="primary" numberOfLines={1} style={styles.value}>
          {place.name}
        </AppText>
      ) : null}
    </Pressable>
    {place ? (
      <Pressable accessibilityRole="button" accessibilityLabel="장소 태그 빼기" onPress={onClear} style={styles.clear}>
        <Icon name="close" size={18} color="ink3" />
      </Pressable>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  main: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2, paddingLeft: 14 },
  label: { flexShrink: 0 },
  value: { flex: 1, textAlign: 'right', paddingRight: SPACING.md },
  clear: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
})

export default PlaceTagRow
