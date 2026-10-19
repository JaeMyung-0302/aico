import type { Pet } from '@miri-pet/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { useDeletePet, useMyPets, useUpdatePet } from '@/modules/pets/data-access-pets/usePets'
import ConfirmDeleteDialog from '@/modules/pets/ui-confirm-delete/ConfirmDeleteDialog'
import PetForm from '@/modules/pets/ui-pet-form/PetForm'
import { alertPhotoNotSaved } from '@/modules/pets/util-pet/alert-photo-not-saved'
import { petSaveErrorMessage } from '@/modules/pets/util-pet/pet-save-error-message'
import type { PetFormSubmit } from '@/modules/pets/util-pet/validate-pet-form'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'

const TITLE = '펫 정보 수정'
const goBackToMyPets = () => (router.canGoBack() ? router.back() : router.replace('/pets'))

// 디자인 03 폼 재사용: 정보·사진 수정 + 펫 삭제(접종 기록·증명서까지 서버가 함께 지운다)
const EditPetForm = ({ pet }: { pet: Pet }) => {
  const updatePet = useUpdatePet(pet.id)
  const deletePet = useDeletePet()
  const toast = useTransientMessage()
  const [isDirty, setIsDirty] = useState(false)
  const [isDeleteVisible, setIsDeleteVisible] = useState(false)
  const isLeaving = updatePet.isPending || updatePet.isSuccess || deletePet.isPending || deletePet.isSuccess
  useConfirmLeave(isDirty && !isLeaving)

  const handleSubmit = (values: PetFormSubmit) => {
    updatePet.mutate(values, {
      onSuccess: ({ isPhotoSaved }) => {
        if (!isPhotoSaved) alertPhotoNotSaved()
        goBackToMyPets()
      },
      onError: (error) => toast.show(petSaveErrorMessage(error)),
    })
  }

  const handleDelete = () => {
    deletePet.mutate(pet.id, {
      onSuccess: goBackToMyPets,
      onError: () => {
        setIsDeleteVisible(false)
        toast.show('삭제하지 못했어요. 잠시 후 다시 시도해 주세요')
      },
    })
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={TITLE} />
      <PetForm
        primaryLabel="저장"
        initialPet={pet}
        onSubmit={handleSubmit}
        onPickPhoto={() => pickImageOrNull('library', () => toast.show(PHOTO_PERMISSION_MESSAGE))}
        isSubmitting={updatePet.isPending}
        onDirtyChange={setIsDirty}
        footer={<Button label="펫 삭제" variant="ghost" onPress={() => setIsDeleteVisible(true)} />}
      />
      <Toast message={toast.message} />
      <ConfirmDeleteDialog
        isVisible={isDeleteVisible}
        title={`${pet.name}의 기록이 모두 삭제돼요`}
        description="접종 기록과 증명서 사진도 함께 지워지고 되돌릴 수 없어요."
        isDeleting={deletePet.isPending}
        onCancel={() => setIsDeleteVisible(false)}
        onConfirm={handleDelete}
      />
    </View>
  )
}

const EditPetScreen = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>()
  const pets = useMyPets()
  const pet = pets.data?.find((candidate) => candidate.id === petId)

  if (pet) return <EditPetForm pet={pet} />
  if (pets.isPending) return <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  return (
    <View style={styles.screen}>
      <AppHeader title={TITLE} />
      {pets.isError ? (
        <EmptyLayout
          title="펫 정보를 불러오지 못했어요"
          onRetry={() => {
            pets.refetch().catch(() => undefined)
          }}
        />
      ) : (
        <EmptyLayout title="반려동물을 찾을 수 없어요" description="삭제되었거나 내 반려동물이 아니에요" />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  loading: { flex: 1 },
})

export default EditPetScreen
