import { MAX_PETS } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import { useMe } from '@/modules/user/data-access-me/useMe'
import PetSelector from '@/modules/pets/ui-my-pets/PetSelector'
import PetSummaryCard from '@/modules/pets/ui-my-pets/PetSummaryCard'
import { useVaccinations } from '@/modules/vaccinations/data-access-vaccinations/useVaccinations'
import NextDueCard from '@/modules/vaccinations/ui-vaccination-list/NextDueCard'
import VaccinationList from '@/modules/vaccinations/ui-vaccination-list/VaccinationList'
import { nextDueFor } from '@/modules/vaccinations/util-vaccination/next-due'
import { kstToday } from '@/modules/vaccinations/util-vaccination/vaccination-dates'

const openEntryCard = (petId: string, vaccinationId?: string) =>
  router.push({ pathname: '/pets/[petId]/entry-card', params: vaccinationId ? { petId, vaccinationId } : { petId } })

// 디자인 14 상단: 펫 추가 · 내 프로필 · 설정(로그아웃·탈퇴·동의 관리 진입점)
const MyPetsHeader = ({ canAddPet }: { canAddPet: boolean }) => {
  const myId = useMe().data?.id
  return (
    <View style={styles.header}>
      <AppText variant="title1" accessibilityRole="header" style={styles.title}>
        내 펫
      </AppText>
      {canAddPet ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="펫 추가"
          onPress={() => router.push('/pets/new')}
          style={styles.icon}
        >
          <Icon name="plus" />
        </Pressable>
      ) : null}
      {myId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="내 프로필"
          onPress={() => router.push({ pathname: '/users/[userId]', params: { userId: myId } })}
          style={styles.icon}
        >
          <Icon name="user" />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="설정"
        onPress={() => router.push('/settings')}
        style={styles.icon}
      >
        <Icon name="settings" />
      </Pressable>
    </View>
  )
}

// 디자인 14 내 펫: 펫 선택 → 펫 카드(입장용 카드) → 다음 접종 D-day → 접종 기록(증명서)
const MyPetsScreen = () => {
  const insets = useSafeAreaInsets()
  const pets = useMyPets()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pet = pets.data?.find((p) => p.id === selectedId) ?? pets.data?.[0]
  const vaccinations = useVaccinations(pet?.id)
  const today = kstToday(new Date())

  if (pets.isError) {
    return (
      <EmptyLayout
        title="펫 정보를 불러오지 못했어요"
        description="네트워크 연결을 확인하고 다시 시도해 주세요."
        onRetry={() => {
          pets.refetch().catch(() => undefined)
        }}
      />
    )
  }
  if (!pets.data) return <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  if (!pet) return <EmptyLayout title="등록된 펫이 없어요" />
  const next = nextDueFor(vaccinations.data ?? [], today)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: SPACING.xxxl }}>
      <MyPetsHeader canAddPet={pets.data.length < MAX_PETS} />
      <PetSelector pets={pets.data} selectedId={pet.id} onSelect={setSelectedId} />
      <View style={styles.body}>
        <PetSummaryCard pet={pet} today={today} onOpenEntryCard={() => openEntryCard(pet.id)} />
        {next ? <NextDueCard next={next} /> : null}
        <View style={styles.sectionHeader}>
          <AppText variant="title3" style={styles.title}>
            접종 기록
          </AppText>
          <Button
            label="기록 추가"
            variant="ghost"
            size="md"
            onPress={() => router.push({ pathname: '/pets/[petId]/vaccinations/new', params: { petId: pet.id } })}
          />
        </View>
        {vaccinations.isError ? (
          <EmptyLayout
            title="접종 기록을 불러오지 못했어요"
            onRetry={() => {
              vaccinations.refetch().catch(() => undefined)
            }}
          />
        ) : (
          <VaccinationList
            vaccinations={vaccinations.data ?? []}
            onPressCertificate={(vaccination) => openEntryCard(pet.id, vaccination.id)}
          />
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ground },
  loading: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { flex: 1 },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  body: { gap: SPACING.lg, padding: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
})

export default MyPetsScreen
