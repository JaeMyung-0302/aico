import type { PublicPet } from '@miri-pet/shared'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { SIZE_LABELS } from '@/modules/pets/util-pet/format-pet'

// 17 프로필 반려동물 탭 카드: 사진 · 이름 · "품종 · 크기" (공개 요약이라 나이·접종 정보는 없다)
export const publicPetInfoLine = (pet: Pick<PublicPet, 'breed' | 'size'>): string =>
  [pet.breed, SIZE_LABELS[pet.size]].filter((part): part is string => Boolean(part)).join(' · ')

const UserPetCard = ({ pet }: { pet: PublicPet }) => (
  <View accessible accessibilityLabel={`${pet.name} ${publicPetInfoLine(pet)}`} style={styles.card}>
    <Avatar name={pet.name} uri={pet.avatarUrl} size={56} />
    <View style={styles.body}>
      <AppText variant="bodyStrong">{pet.name}</AppText>
      <AppText variant="callout" color="ink2">
        {publicPetInfoLine(pet)}
      </AppText>
    </View>
  </View>
)

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  body: { flex: 1, gap: SPACING.xxs },
})

export default UserPetCard
