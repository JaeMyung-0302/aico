import type { PetSize, PlaceReportKind } from '@miri-pet/shared'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Chip from '@/design-system/components/Chip'
import TextField from '@/design-system/components/TextField'
import Toggle from '@/design-system/components/Toggle'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { categoryLabel, SIZE_LABELS } from '../util-place-format'
import type { PlaceCategoryValue } from '../util-place-query'
import type { PlaceReportDraft } from '../util-place-report'
import ReportPhotoPicker, { type ReportPhotoPickerProps } from './ReportPhotoPicker'

type PlaceReportFormProps = {
  draft: PlaceReportDraft
  kinds: readonly PlaceReportKind[]
  onChange: (next: PlaceReportDraft) => void
  photoPicker: ReportPhotoPickerProps
}

const KIND_OPTIONS: Record<PlaceReportKind, { label: string; hint: string }> = {
  EDIT: { label: '정보 수정', hint: '동반 조건이나 주소가 달라요' },
  CLOSED: { label: '폐업 · 동반 불가', hint: '더 이상 반려동물과 갈 수 없어요' },
  NEW: { label: '새 장소 추천', hint: '목록에 없는 동반 가능 장소예요' },
}
const CATEGORIES: readonly PlaceCategoryValue[] = ['CAFE', 'RESTAURANT', 'PARK', 'ACCOMMODATION', 'HOSPITAL', 'ETC']
const SIZES: readonly PetSize[] = ['S', 'M', 'L']

const toggleSize = (sizes: readonly PetSize[], size: PetSize): PetSize[] =>
  sizes.includes(size) ? sizes.filter((s) => s !== size) : SIZES.filter((s) => s === size || sizes.includes(s))

const KindOption = ({
  kind,
  isSelected,
  onPress,
}: {
  kind: PlaceReportKind
  isSelected: boolean
  onPress: () => void
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: isSelected }}
    onPress={onPress}
    style={[styles.option, isSelected ? styles.optionOn : styles.optionOff]}
  >
    <AppText variant="bodyStrong">{KIND_OPTIONS[kind].label}</AppText>
    <AppText variant="caption" color="ink2">
      {KIND_OPTIONS[kind].hint}
    </AppText>
  </Pressable>
)

const PlaceFields = ({ draft, onChange }: Pick<PlaceReportFormProps, 'draft' | 'onChange'>) => (
  <>
    <TextField
      label="장소 이름"
      isRequired={draft.kind === 'NEW'}
      value={draft.name}
      maxLength={60}
      onChangeText={(name) => onChange({ ...draft, name })}
    />
    <TextField
      label="주소"
      isRequired={draft.kind === 'NEW'}
      value={draft.address}
      maxLength={200}
      onChangeText={(address) => onChange({ ...draft, address })}
    />
    <AppText variant="captionStrong" color="ink2">
      업종
    </AppText>
    <View style={styles.chips}>
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={categoryLabel(category)}
          isSelected={draft.category === category}
          onPress={() => onChange({ ...draft, category })}
        />
      ))}
    </View>
    <AppText variant="captionStrong" color="ink2">
      함께 갈 수 있는 크기
    </AppText>
    <View style={styles.chips}>
      {SIZES.map((size) => (
        <Chip
          key={size}
          label={SIZE_LABELS[size]}
          isSelected={draft.allowedSizes.includes(size)}
          onPress={() => onChange({ ...draft, allowedSizes: toggleSize(draft.allowedSizes, size) })}
        />
      ))}
    </View>
    <View style={styles.toggleRow}>
      <AppText variant="body">실내 동반 가능</AppText>
      <Toggle
        label="실내 동반 가능"
        isOn={draft.indoorAllowed}
        onChange={(indoorAllowed) => onChange({ ...draft, indoorAllowed })}
      />
    </View>
    <TextField
      label="동반 조건 메모"
      placeholder="예: 매너벨트 필수, 테라스석만"
      value={draft.conditionsNote}
      maxLength={300}
      onChangeText={(conditionsNote) => onChange({ ...draft, conditionsNote })}
    />
  </>
)

// 11 장소 제보 폼. 값 검증·요청 변환은 util-place-report가 맡는다
const PlaceReportForm = ({ draft, kinds, onChange, photoPicker }: PlaceReportFormProps) => (
  <View style={styles.wrap}>
    {kinds.length > 1 ? (
      <View style={styles.options}>
        <AppText variant="bodyStrong">어떤 제보인가요?</AppText>
        {kinds.map((kind) => (
          <KindOption
            key={kind}
            kind={kind}
            isSelected={draft.kind === kind}
            onPress={() => onChange({ ...draft, kind })}
          />
        ))}
      </View>
    ) : null}
    {draft.kind === 'CLOSED' ? null : <PlaceFields draft={draft} onChange={onChange} />}
    <TextField
      testID="place-report-note"
      label={draft.kind === 'NEW' ? '추가로 알려줄 내용' : '무엇이 달라졌나요?'}
      multiline
      value={draft.note}
      maxLength={500}
      onChangeText={(note) => onChange({ ...draft, note })}
      style={styles.note}
    />
    <ReportPhotoPicker {...photoPicker} />
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md },
  options: { gap: SPACING.sm },
  option: { minHeight: 64, padding: SPACING.md, borderRadius: RADIUS.lg, gap: SPACING.xxs, justifyContent: 'center' },
  optionOn: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  optionOff: { borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { minHeight: 96, paddingTop: SPACING.md, textAlignVertical: 'top' },
})

export default PlaceReportForm
