import { type ReactNode, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import Button from '@/design-system/components/Button'
import Chip from '@/design-system/components/Chip'
import TextField from '@/design-system/components/TextField'
import { SPACING } from '@/design-system/tokens/spacing'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { formatDateInput } from '@/modules/vaccinations/util-vaccination/vaccination-dates'
import {
  type PetFormErrors,
  type PetFormState,
  type PetFormSubmit,
  type PetSpecies,
  validatePetForm,
} from '../util-pet/validate-pet-form'
import SizeOption from './SizeOption'

export type PetFormIntent = 'next' | 'later'

type PetFormProps = {
  primaryLabel: string
  // 03 온보딩의 "접종 기록은 나중에 할게요" — 같은 값으로 제출하고 이동만 다르다
  secondaryLabel?: string
  onSubmit: (values: PetFormSubmit, intent: PetFormIntent) => void
  onPickPhoto: () => Promise<PickedImage | null>
  isSubmitting?: boolean
}

const SPECIES: readonly { value: PetSpecies; label: string }[] = [
  { value: 'DOG', label: '강아지' },
  { value: 'CAT', label: '고양이' },
  { value: 'ETC', label: '기타' },
]

const SIZES = [
  { value: 'S', label: '소형', hint: '~10kg' },
  { value: 'M', label: '중형', hint: '10~25kg' },
  { value: 'L', label: '대형', hint: '25kg~' },
] as const

const INITIAL: PetFormState = { name: '', species: 'DOG', size: 'S', breed: '', birthDate: '', photo: null }

// 디자인 03 펫 프로필 만들기 (이름·종류·크기 필수, 품종·생일·사진 선택)
const PetForm = ({ primaryLabel, secondaryLabel, onSubmit, onPickPhoto, isSubmitting = false }: PetFormProps) => {
  const [state, setState] = useState<PetFormState>(INITIAL)
  const [errors, setErrors] = useState<PetFormErrors>({})
  const update = (patch: Partial<PetFormState>) => setState((prev) => ({ ...prev, ...patch }))

  const handleSubmit = (intent: PetFormIntent) => {
    const result = validatePetForm(state)
    setErrors(result.errors)
    if (result.submit) onSubmit(result.submit, intent)
  }

  const handlePickPhoto = () => {
    onPickPhoto()
      .then((photo) => photo && update({ photo }))
      .catch(() => undefined)
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="사진 추가" onPress={handlePickPhoto} style={styles.photo}>
        <Avatar name={state.name.trim() || '펫'} uri={state.photo?.uri} size={96} />
      </Pressable>
      <TextField
        testID="pet-name-input"
        label="이름"
        isRequired
        value={state.name}
        onChangeText={(name) => update({ name })}
        errorMessage={errors.name}
      />
      <OptionGroup title="종류 *">
        {SPECIES.map(({ value, label }) => (
          <Chip key={value} label={label} isSelected={state.species === value} onPress={() => update({ species: value })} />
        ))}
      </OptionGroup>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="품종" value={state.breed} onChangeText={(breed) => update({ breed })} maxLength={40} />
        </View>
        <View style={styles.flex}>
          <TextField
            label="생일"
            value={state.birthDate}
            onChangeText={(raw) => update({ birthDate: formatDateInput(raw) })}
            placeholder="YYYY-MM-DD"
            keyboardType="number-pad"
            errorMessage={errors.birthDate}
          />
        </View>
      </View>
      <OptionGroup title="크기 * · 동반 장소 필터에 쓰여요">
        {SIZES.map(({ value, label, hint }) => (
          <SizeOption key={value} label={label} hint={hint} isSelected={state.size === value} onPress={() => update({ size: value })} />
        ))}
      </OptionGroup>
      <View style={styles.actions}>
        <Button label={primaryLabel} onPress={() => handleSubmit('next')} isLoading={isSubmitting} />
        {secondaryLabel ? (
          <Button label={secondaryLabel} variant="ghost" onPress={() => handleSubmit('later')} disabled={isSubmitting} />
        ) : null}
      </View>
    </ScrollView>
  )
}

const OptionGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.group}>
    <AppText variant="captionStrong" color="ink2">
      {title}
    </AppText>
    <View style={styles.row}>{children}</View>
  </View>
)

const styles = StyleSheet.create({
  content: { padding: SPACING.xxl, gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  photo: { alignSelf: 'center' },
  group: { gap: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
  actions: { gap: SPACING.xs, marginTop: SPACING.sm },
})

export default PetForm
