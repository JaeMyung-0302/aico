import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { useSavePet } from '@/modules/pets/data-access-pets/usePets'
import PetForm from '@/modules/pets/ui-pet-form/PetForm'
import type { PetFormSubmit } from '@/modules/pets/util-pet/validate-pet-form'
import { ApiError } from '@/shared/api/api-error'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import { alertPhotoNotSaved } from '@/modules/pets/util-pet/alert-photo-not-saved'

// 5마리 제한(422)은 서버 메시지를 그대로 보여준다
const toSaveErrorMessage = (error: unknown): string =>
  error instanceof ApiError && error.status === 422 ? error.message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요'

// 디자인 03 재사용 — 14 내 펫의 "+"에서 추가
const NewPetScreen = () => {
  const savePet = useSavePet()
  const toast = useTransientMessage()

  const handleSubmit = (values: PetFormSubmit) => {
    savePet.mutate(values, {
      onSuccess: ({ isPhotoSaved }) => {
        if (!isPhotoSaved) alertPhotoNotSaved()
        router.back()
      },
      onError: (error) => toast.show(toSaveErrorMessage(error)),
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
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: COLORS.surface } })

export default NewPetScreen
