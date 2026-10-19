import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import { useSaveVaccination } from '@/modules/vaccinations/data-access-vaccinations/useVaccinations'
import VaccinationForm from '@/modules/vaccinations/ui-vaccination-form/VaccinationForm'
import { kstToday } from '@/modules/vaccinations/util-vaccination/vaccination-dates'
import type { VaccinationFormSubmit } from '@/modules/vaccinations/util-vaccination/validate-vaccination-form'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'

// 디자인 15 접종 기록 추가: (증명서 동의 → 촬영본 업로드) → 기록 저장 → 14로 돌아간다
const NewVaccinationScreen = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>()
  const pets = useMyPets()
  const pet = pets.data?.find((candidate) => candidate.id === petId)
  const save = useSaveVaccination(petId)
  const toast = useTransientMessage()
  const [isDirty, setIsDirty] = useState(false)
  useConfirmLeave(isDirty && !save.isPending && !save.isSuccess)

  const handleSubmit = (values: VaccinationFormSubmit) => {
    save.mutate(values, {
      onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/pets')),
      onError: () => toast.show('저장하지 못했어요. 잠시 후 다시 시도해 주세요'),
    })
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={pet ? `${pet.name} · 접종 기록 추가` : '접종 기록 추가'} />
      <VaccinationForm
        today={kstToday(new Date())}
        onSubmit={handleSubmit}
        onPickCertificate={() => pickImageOrNull('camera', () => toast.show(PHOTO_PERMISSION_MESSAGE))}
        isSubmitting={save.isPending}
        onDirtyChange={setIsDirty}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: COLORS.surface } })

export default NewVaccinationScreen
