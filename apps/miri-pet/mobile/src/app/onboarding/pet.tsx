import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { registerPushToken } from '@/modules/notifications/util-push-registration'
import { useSavePet } from '@/modules/pets/data-access-pets/usePets'
import PetForm, { type PetFormIntent } from '@/modules/pets/ui-pet-form/PetForm'
import type { PetFormSubmit } from '@/modules/pets/util-pet/validate-pet-form'
import { track } from '@/shared/analytics/track'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import { alertPhotoNotSaved } from '@/modules/pets/util-pet/alert-photo-not-saved'

// 디자인 03 펫 프로필 만들기 (온보딩 2/2). 완료 → onboarding_completed + 알림 권한 요청(D-7·D-1 접종 알림)
const OnboardingPetScreen = () => {
  const insets = useSafeAreaInsets()
  const savePet = useSavePet()
  const toast = useTransientMessage()

  const handleSubmit = (values: PetFormSubmit, intent: PetFormIntent) => {
    savePet.mutate(values, {
      onSuccess: ({ pet, isPhotoSaved }) => {
        if (!isPhotoSaved) alertPhotoNotSaved()
        track('onboarding_completed')
        registerPushToken({ shouldRequestPermission: true }).catch(() => undefined)
        if (intent === 'next') {
          router.replace({ pathname: '/pets/[petId]/vaccinations/new', params: { petId: pet.id } })
        } else {
          router.replace('/pets')
        }
      },
      onError: () => toast.show('저장하지 못했어요. 잠시 후 다시 시도해 주세요'),
    })
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom }]}>
      <View style={styles.intro}>
        <AppText variant="captionStrong" color="primary">
          2 / 2
        </AppText>
        <AppText variant="title1" accessibilityRole="header">
          함께 사는 아이를 소개해 주세요
        </AppText>
      </View>
      <PetForm
        primaryLabel="완료하고 접종 기록 추가하기"
        secondaryLabel="접종 기록은 나중에 할게요"
        onSubmit={handleSubmit}
        onPickPhoto={() => pickImageOrNull('library', () => toast.show(PHOTO_PERMISSION_MESSAGE))}
        isSubmitting={savePet.isPending}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  intro: { gap: SPACING.sm, paddingHorizontal: SPACING.xxl },
})

export default OnboardingPetScreen
