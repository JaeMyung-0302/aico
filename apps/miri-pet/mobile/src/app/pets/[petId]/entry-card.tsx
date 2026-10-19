import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import { useVaccinations } from '@/modules/vaccinations/data-access-vaccinations/useVaccinations'
import CertificateViewer from '@/modules/vaccinations/ui-entry-card/CertificateViewer'
import EntryCardSummary from '@/modules/vaccinations/ui-entry-card/EntryCardSummary'

// 디자인 16 입장용 카드. 14의 "증명서" 배지로 오면(vaccinationId) 바로 원본 보기 → 14 → 카드 → 증명서 3탭 이내
const EntryCardScreen = () => {
  const { petId, vaccinationId } = useLocalSearchParams<{ petId: string; vaccinationId?: string }>()
  const insets = useSafeAreaInsets()
  const myPets = useMyPets()
  const pet = myPets.data?.find((candidate) => candidate.id === petId)
  // 내 펫 목록에 없는 id(삭제된 펫·오래된 푸시)는 접종 기록을 조회하지 않는다
  const vaccinations = useVaccinations(pet?.id)
  const [isCertificateView, setIsCertificateView] = useState(Boolean(vaccinationId))
  const [selectedId, setSelectedId] = useState<string | null>(vaccinationId ?? null)

  if (myPets.isSuccess && !pet) {
    return (
      <View style={styles.screen}>
        <AppHeader title="입장용 카드" />
        <EmptyLayout title="반려동물을 찾을 수 없어요" description="삭제되었거나 내 반려동물이 아니에요" />
      </View>
    )
  }
  if (!pet || !vaccinations.data) {
    // 펫 목록·접종 기록 중 하나라도 실패하면 무한 로딩 대신 다시 시도를 보여준다
    const failed = myPets.isError ? myPets : vaccinations.isError ? vaccinations : null
    return failed ? (
      <View style={styles.screen}>
        <AppHeader title="입장용 카드" />
        <EmptyLayout
          title="카드를 불러오지 못했어요"
          onRetry={() => {
            failed.refetch().catch(() => undefined)
          }}
        />
      </View>
    ) : (
      <ActivityIndicator style={styles.loading} color={COLORS.primary} />
    )
  }
  const withCertificates = vaccinations.data.filter((v) => v.certificateCount > 0)
  const activeId = selectedId ?? withCertificates[0]?.id ?? null

  return (
    <View style={styles.screen}>
      <AppHeader title="입장용 카드" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}>
        {isCertificateView ? (
          <CertificateViewer withCertificates={withCertificates} selectedId={activeId} onSelect={setSelectedId} />
        ) : (
          <EntryCardSummary pet={pet} vaccinations={vaccinations.data} />
        )}
        <Button
          label={isCertificateView ? '요약으로 돌아가기' : '증명서 원본 보기'}
          variant={isCertificateView ? 'secondary' : 'dark'}
          onPress={() => setIsCertificateView((prev) => !prev)}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ground },
  loading: { flex: 1 },
  content: { gap: SPACING.lg, padding: SPACING.lg },
})

export default EntryCardScreen
