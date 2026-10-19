import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLogout } from '@/modules/auth/data-access-auth/useLogout'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { registerPushToken } from '@/modules/notifications/util-push-registration'
import { useMyPets, useSavePet } from '@/modules/pets/data-access-pets/usePets'
import PetForm, { type PetFormIntent } from '@/modules/pets/ui-pet-form/PetForm'
import type { PetFormSubmit } from '@/modules/pets/util-pet/validate-pet-form'
import { track } from '@/shared/analytics/track'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import { alertPhotoNotSaved } from '@/modules/pets/util-pet/alert-photo-not-saved'

type SavedPetIntent = { petId: string; intent: PetFormIntent }

// 디자인 03 펫 프로필 만들기 (온보딩 2/2). 완료 → onboarding_completed + 알림 권한 요청(D-7·D-1 접종 알림)
const OnboardingPetScreen = () => {
  const insets = useSafeAreaInsets()
  const savePet = useSavePet()
  const myPets = useMyPets()
  const logout = useLogout()
  const toast = useTransientMessage()
  const [savedPet, setSavedPet] = useState<SavedPetIntent | null>(null)
  const [isLogoutVisible, setIsLogoutVisible] = useState(false)
  // 인증 게이트와 같은 규칙: 펫이 생기면(또는 조회 실패) 탭이 열린다
  const isAppUnlocked = myPets.isError || (myPets.data?.length ?? 0) > 0

  // 펫을 만들기 전에는 돌아갈 화면이 없다 → 뒤로(헤더·Android) = 로그아웃 확인
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsLogoutVisible(true)
      return true
    })
    return () => subscription.remove()
  }, [])

  // 탭(Stack.Protected)이 열린 뒤에 이동한다: 내 펫 탭 위에 접종 폼을 쌓아 뒤로 = 내 펫
  useEffect(() => {
    if (!savedPet || !isAppUnlocked) return
    router.replace('/pets')
    if (savedPet.intent === 'next') {
      router.push({ pathname: '/pets/[petId]/vaccinations/new', params: { petId: savedPet.petId } })
    }
  }, [savedPet, isAppUnlocked])

  const handleSubmit = (values: PetFormSubmit, intent: PetFormIntent) => {
    savePet.mutate(values, {
      onSuccess: ({ pet, isPhotoSaved }) => {
        if (!isPhotoSaved) alertPhotoNotSaved()
        track('onboarding_completed')
        registerPushToken({ shouldRequestPermission: true }).catch(() => undefined)
        setSavedPet({ petId: pet.id, intent })
      },
      onError: () => toast.show('저장하지 못했어요. 잠시 후 다시 시도해 주세요'),
    })
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <AppHeader onBackPress={() => setIsLogoutVisible(true)} />
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
      <Dialog
        isVisible={isLogoutVisible}
        onClose={() => setIsLogoutVisible(false)}
        title="로그아웃할까요?"
        description="다른 계정으로 로그인할 수 있어요"
        actions={
          <>
            <Button
              label="취소"
              variant="secondary"
              size="md"
              onPress={() => setIsLogoutVisible(false)}
              style={styles.action}
            />
            <Button
              label="로그아웃"
              variant="dark"
              size="md"
              isLoading={logout.isPending}
              onPress={() => logout.mutate()}
              style={styles.action}
            />
          </>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  intro: { gap: SPACING.sm, paddingTop: SPACING.lg, paddingHorizontal: SPACING.xxl },
  action: { flex: 1 },
})

export default OnboardingPetScreen
