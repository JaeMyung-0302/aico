import type { Place } from '@miri-pet/shared'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS, PLACEHOLDER_TINTS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { categoryLabel, formatDistance, formatVerifiedLine, sizeRuleLabel } from '../util-place-format'

type PlaceRowProps = {
  place: Place
  distanceKm?: number
  onPress: () => void
}

const THUMB_SIZE = 76

const tintFor = (id: string) => PLACEHOLDER_TINTS[id.charCodeAt(id.length - 1) % PLACEHOLDER_TINTS.length]

const PlaceRow = ({ place, distanceKm, onPress }: PlaceRowProps) => {
  const tint = tintFor(place.id)
  const meta = [categoryLabel(place.category), distanceKm === undefined ? null : formatDistance(distanceKm)]
  return (
    <Pressable
      testID="place-row"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: tint?.background }]}>
        <Icon name="pin" color="ink2" />
      </View>
      <View style={styles.body}>
        <AppText variant="caption" color="ink2">
          {meta.filter(Boolean).join(' · ')}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {place.name}
        </AppText>
        <AppText variant="callout" color="ink2">
          {sizeRuleLabel(place.allowedSizes, place.indoorAllowed)}
        </AppText>
        <AppText variant="caption" color="ink3">
          {formatVerifiedLine(place)}
        </AppText>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: { opacity: 0.7 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: SPACING.xxs },
})

export default PlaceRow
