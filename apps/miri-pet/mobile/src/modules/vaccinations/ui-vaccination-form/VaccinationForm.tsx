import { VACCINE_PRESETS, type Vaccination } from '@miri-pet/shared'
import { type ReactNode, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import KeyboardAvoider from '@/design-system/components/KeyboardAvoider'
import Chip from '@/design-system/components/Chip'
import TextField from '@/design-system/components/TextField'
import { SPACING } from '@/design-system/tokens/spacing'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import {
  validateVaccinationForm,
  type VaccinationFormErrors,
  type VaccinationFormSubmit,
} from '../util-vaccination/validate-vaccination-form'
import CertificateCapture from './CertificateCapture'
import { useVaccinationFormState } from './useVaccinationFormState'

type VaccinationFormProps = {
  today: string
  onSubmit: (values: VaccinationFormSubmit) => void
  // 카메라를 열어 사진 1장을 돌려준다(취소·거부면 null)
  onPickCertificate: () => Promise<PickedImage | null>
  isSubmitting?: boolean
  // 수정 화면: 저장된 값으로 채운다. 수정 API가 증명서를 받지 않아 촬영 영역은 숨긴다
  initialVaccination?: Vaccination
  // 작성 중 이탈 확인용 — 처음 값과 달라졌는지 알린다
  onDirtyChange?: (isDirty: boolean) => void
  // 저장 버튼 아래 (예: 기록 삭제)
  footer?: ReactNode
}

const DATE_PLACEHOLDER = 'YYYY-MM-DD'

// 디자인 15 접종 기록 추가·수정 폼 — 저장(업로드·생성·수정)은 화면이 맡는다
const VaccinationForm = ({
  today,
  onSubmit,
  onPickCertificate,
  isSubmitting = false,
  initialVaccination,
  onDirtyChange,
  footer,
}: VaccinationFormProps) => {
  const form = useVaccinationFormState(today, initialVaccination)
  const [errors, setErrors] = useState<VaccinationFormErrors>({})
  const { state, isDirty } = form

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const handleCapture = async () => {
    const image = await onPickCertificate()
    if (image) form.addCertificate(image)
  }

  const handleSave = () => {
    const result = validateVaccinationForm(state, today)
    setErrors(result.errors)
    if (result.submit) onSubmit(result.submit)
  }

  return (
    <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {initialVaccination ? null : (
          <CertificateCapture
            certificates={state.certificates}
            canAdd={form.canAddCertificate}
            hasConsent={state.hasCertificateConsent}
            errorMessage={errors.certificates}
            onCapture={() => {
              handleCapture().catch(() => undefined)
            }}
            onRemove={form.removeCertificate}
            onToggleConsent={form.toggleCertificateConsent}
          />
        )}
        <View style={styles.section}>
          <AppText variant="captionStrong" color="ink2">
            접종 종류 *
          </AppText>
          <View style={styles.chips}>
            {VACCINE_PRESETS.map((preset) => (
              <Chip
                key={preset.type}
                label={preset.label}
                isSelected={state.type === preset.type}
                onPress={() => form.setType(preset.type)}
              />
            ))}
          </View>
          {state.type === 'ETC' ? (
            <TextField
              label="접종 이름"
              isRequired
              value={state.customName}
              onChangeText={form.setCustomName}
              maxLength={40}
              errorMessage={errors.customName}
            />
          ) : null}
        </View>
        <DateFields form={form} errors={errors} />
        <TextField label="병원 (선택)" value={state.clinicName} onChangeText={form.setClinicName} maxLength={60} />
        <AppText variant="callout" color="ink2">
          다음 접종 7일 전 · 하루 전 알림
        </AppText>
        <Button label="저장" onPress={handleSave} isLoading={isSubmitting} />
        {footer}
      </ScrollView>
    </KeyboardAvoider>
  )
}

const DateFields = ({
  form,
  errors,
}: {
  form: ReturnType<typeof useVaccinationFormState>
  errors: VaccinationFormErrors
}) => (
  <View style={styles.section}>
    <TextField
      label="접종일"
      isRequired
      value={form.state.administeredOn}
      onChangeText={form.setAdministeredOn}
      placeholder={DATE_PLACEHOLDER}
      keyboardType="number-pad"
      errorMessage={errors.administeredOn}
    />
    <TextField
      label="다음 접종일"
      value={form.state.nextDueOn}
      onChangeText={form.setNextDueOn}
      placeholder={DATE_PLACEHOLDER}
      keyboardType="number-pad"
      errorMessage={errors.nextDueOn}
    />
    {form.state.type !== 'ETC' ? (
      <AppText variant="caption" color="ink3">
        보통 주기에 맞춰 다음 접종일을 채워뒀어요. 수의사 안내에 맞게 고쳐 주세요.
      </AppText>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  section: { gap: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
})

export default VaccinationForm
