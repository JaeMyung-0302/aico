import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { useSavePet } from '@/modules/pets/data-access-pets/usePets'
import PetForm from '@/modules/pets/ui-pet-form/PetForm'
import { petSaveErrorMessage } from '@/modules/pets/util-pet/pet-save-error-message'
import type { PetFormSubmit } from '@/modules/pets/util-pet/validate-pet-form'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import { alertPhotoNotSaved } from '@/modules/pets/util-pet/alert-photo-not-saved'

// 디자인 03 재사용 — 14 내 펫의 "+"에서 추가
const NewPetScreen = () => {
  const savePet = useSavePet()
  const toast = useTransientMessage()
  const [isDirty, setIsDirty] = useState(false)
  // 저장 중·저장 후에는 막지 않는다(성공 시 router.back이 확인 없이 나간다)
  useConfirmLeave(isDirty && !savePet.isPending && !savePet.isSuccess)

  const handleSubmit = (values: PetFormSubmit) => {
    savePet.mutate(values, {
      onSuccess: ({ isPhotoSaved }) => {
        if (!isPhotoSaved) alertPhotoNotSaved()
        router.back()
      },
      onError: (error) => toast.show(petSaveErrorMessage(error)),
    })
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="펫 추가" />
      <PetForm
        primaryLabel="저장"
        onSubmit={handleSubmit}
        onPickPhoto={() => pickImageOrNull('library', () => toast.show(PHOTO_PERMISSION_MESSAGE))}
        isSubmitting={savePet.isPending}
        onDirtyChange={setIsDirty}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: COLORS.surface } })

export default NewPetScreen
