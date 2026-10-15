import type { Pet, Vaccination } from '@miri-pet/shared'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { SIZE_LABELS } from '@/modules/pets/util-pet/format-pet'
import { formatDotDate, vaccineLabel } from '../util-vaccination/vaccination-dates'

const RECENT_COUNT = 3

// "말티즈 · 소형 · 2021년생"
const entryInfoLine = (pet: Pet): string =>
  [pet.breed, SIZE_LABELS[pet.size], pet.birthDate ? `${pet.birthDate.slice(0, 4)}년생` : null]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

// 디자인 16 요약: 펫 정보 + 최근 접종(최대 3건) + 보호자 기록 안내
const EntryCardSummary = ({ pet, vaccinations }: { pet: Pet; vaccinations: readonly Vaccination[] }) => (
  <View style={styles.card}>
    <AppText variant="captionStrong" color="primary">
      미리펫 입장용 카드
    </AppText>
    <View style={styles.header}>
      <Avatar name={pet.name} uri={pet.avatarUrl} size={72} />
      <View style={styles.flex}>
        <AppText variant="title1">{pet.name}</AppText>
        <AppText variant="callout" color="ink2">
          {entryInfoLine(pet)}
        </AppText>
      </View>
    </View>
    <AppText variant="captionStrong" color="ink2">
      최근 접종
    </AppText>
    {vaccinations.length === 0 ? (
      <AppText variant="callout" color="ink3">
        기록된 접종이 없어요
      </AppText>
    ) : (
      vaccinations.slice(0, RECENT_COUNT).map((vaccination) => (
        <View key={vaccination.id} style={styles.row}>
          <AppText variant="bodyStrong" style={styles.flex}>
            {vaccineLabel(vaccination.type, vaccination.customName)}
          </AppText>
          <AppText variant="body" color="ink2">
            {formatDotDate(vaccination.administeredOn)}
          </AppText>
        </View>
      ))
    )}
    <AppText variant="caption" color="ink3">
      보호자가 직접 기록한 정보예요. 원본 증명서로 확인해 주세요.
    </AppText>
  </View>
)

const styles = StyleSheet.create({
  card: { gap: SPACING.md, padding: SPACING.xl, borderRadius: RADIUS.xxl, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
  flex: { flex: 1 },
})

export default EntryCardSummary
