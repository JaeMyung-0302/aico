import type { Pet } from '@miri-pet/shared'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { petInfoLine } from '../util-pet/format-pet'

type PetSummaryCardProps = { pet: Pet; today: string; onOpenEntryCard: () => void }

// 디자인 14 펫 카드: 사진 · 이름 · 품종/나이/크기 · 입장용 카드 열기
const PetSummaryCard = ({ pet, today, onOpenEntryCard }: PetSummaryCardProps) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Avatar name={pet.name} uri={pet.avatarUrl} size={84} />
      <View style={styles.body}>
        <AppText variant="title2">{pet.name}</AppText>
        <AppText variant="callout" color="ink2">
          {petInfoLine(pet, today)}
        </AppText>
      </View>
    </View>
    <Button label="입장용 카드 열기" variant="secondary" size="md" onPress={onOpenEntryCard} />
  </View>
)

const styles = StyleSheet.create({
  card: { gap: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.xl, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  body: { flex: 1, gap: SPACING.xs },
})

export default PetSummaryCard
