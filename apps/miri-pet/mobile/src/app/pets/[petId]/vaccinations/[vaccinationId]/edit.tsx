import type { Vaccination } from '@miri-pet/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import ConfirmDeleteDialog from '@/modules/pets/ui-confirm-delete/ConfirmDeleteDialog'
import {
  useDeleteVaccination,
  useUpdateVaccination,
  useVaccinations,
} from '@/modules/vaccinations/data-access-vaccinations/useVaccinations'
import VaccinationForm from '@/modules/vaccinations/ui-vaccination-form/VaccinationForm'
import { kstToday, vaccineLabel } from '@/modules/vaccinations/util-vaccination/vaccination-dates'
import type { VaccinationFormSubmit } from '@/modules/vaccinations/util-vaccination/validate-vaccination-form'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'

const TITLE = '접종 기록 수정'
const goBackToMyPets = () => (router.canGoBack() ? router.back() : router.replace('/pets'))

type EditVaccinationFormProps = { petId: string; petName: string | undefined; vaccination: Vaccination }

// 디자인 15 폼 재사용: 날짜·다음 접종일·병원 수정 + 기록 삭제(증명서는 서버가 함께 지운다)
const EditVaccinationForm = ({ petId, petName, vaccination }: EditVaccinationFormProps) => {
  const update = useUpdateVaccination(petId, vaccination.id)
  const remove = useDeleteVaccination(petId)
  const toast = useTransientMessage()
  const [isDirty, setIsDirty] = useState(false)
  const [isDeleteVisible, setIsDeleteVisible] = useState(false)
  const isLeaving = update.isPending || update.isSuccess || remove.isPending || remove.isSuccess
  useConfirmLeave(isDirty && !isLeaving)

  const handleSubmit = ({ request }: VaccinationFormSubmit) => {
    update.mutate(request, {
      onSuccess: goBackToMyPets,
      onError: () => toast.show('저장하지 못했어요. 잠시 후 다시 시도해 주세요'),
    })
  }

  const handleDelete = () => {
    remove.mutate(vaccination.id, {
      onSuccess: goBackToMyPets,
      onError: () => {
        setIsDeleteVisible(false)
        toast.show('삭제하지 못했어요. 잠시 후 다시 시도해 주세요')
      },
    })
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={petName ? `${petName} · ${TITLE}` : TITLE} />
      <VaccinationForm
        today={kstToday(new Date())}
        initialVaccination={vaccination}
        onSubmit={handleSubmit}
        onPickCertificate={async () => null}
        isSubmitting={update.isPending}
        onDirtyChange={setIsDirty}
        footer={<Button label="기록 삭제" variant="ghost" onPress={() => setIsDeleteVisible(true)} />}
      />
      <Toast message={toast.message} />
      <ConfirmDeleteDialog
        isVisible={isDeleteVisible}
        title={`${vaccineLabel(vaccination.type, vaccination.customName)} 기록을 삭제할까요?`}
        description={
          vaccination.certificateCount > 0
            ? '붙어 있는 증명서 사진도 함께 지워지고 되돌릴 수 없어요.'
            : '삭제하면 되돌릴 수 없어요.'
        }
        isDeleting={remove.isPending}
        onCancel={() => setIsDeleteVisible(false)}
        onConfirm={handleDelete}
      />
    </View>
  )
}

const EditVaccinationScreen = () => {
  const { petId, vaccinationId } = useLocalSearchParams<{ petId: string; vaccinationId: string }>()
  const pets = useMyPets()
  const vaccinations = useVaccinations(petId)
  const vaccination = vaccinations.data?.find((candidate) => candidate.id === vaccinationId)
  const petName = pets.data?.find((candidate) => candidate.id === petId)?.name

  if (vaccination) return <EditVaccinationForm petId={petId} petName={petName} vaccination={vaccination} />
  if (vaccinations.isPending) return <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  return (
    <View style={styles.screen}>
      <AppHeader title={TITLE} />
      {vaccinations.isError ? (
        <EmptyLayout
          title="접종 기록을 불러오지 못했어요"
          onRetry={() => {
            vaccinations.refetch().catch(() => undefined)
          }}
        />
      ) : (
        <EmptyLayout title="접종 기록을 찾을 수 없어요" description="이미 삭제된 기록이에요" />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  loading: { flex: 1 },
})

export default EditVaccinationScreen
