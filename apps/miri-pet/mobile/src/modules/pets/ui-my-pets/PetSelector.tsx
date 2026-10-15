import type { Pet } from '@miri-pet/shared'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type PetSelectorProps = { pets: readonly Pet[]; selectedId: string | null; onSelect: (petId: string) => void }

// 디자인 14 상단 펫 칩 (가로 스크롤)
const PetSelector = ({ pets, selectedId, onSelect }: PetSelectorProps) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {pets.map((pet) => {
      const isSelected = pet.id === selectedId
      return (
        <Pressable
          key={pet.id}
          accessibilityRole="button"
          accessibilityLabel={pet.name}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelect(pet.id)}
          style={[styles.chip, isSelected ? styles.selected : styles.idle]}
        >
          <Avatar name={pet.name} uri={pet.avatarUrl} size={30} />
          <AppText variant="calloutStrong" color={isSelected ? 'ink' : 'ink2'}>
            {pet.name}
          </AppText>
        </Pressable>
      )
    })}
  </ScrollView>
)

const styles = StyleSheet.create({
  row: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  chip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: SPACING.xs + 2,
    paddingRight: SPACING.md + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  idle: { borderWidth: 1, borderColor: COLORS.borderStrong },
  selected: { borderWidth: 2, borderColor: COLORS.ink },
})

export default PetSelector
