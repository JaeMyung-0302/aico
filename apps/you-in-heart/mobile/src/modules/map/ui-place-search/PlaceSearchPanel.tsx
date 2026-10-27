import type { PlaceSearchResult } from '@you-in-heart/shared'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import { isApiErrorKind } from '@/shared/api/api-error'
import { usePlaceSearch } from '../data-access-place/usePlaceSearch'

type PlaceSearchPanelProps = {
  onSelect: (result: PlaceSearchResult) => void
  isBusy?: boolean
}

const MAX_RESULTS = 8

const searchErrorText = (error: unknown): string =>
  isApiErrorKind(error, 'RATE_LIMITED') ? '잠시 후 다시 검색해 주세요' : '검색하지 못했어요. 잠시 후 다시 시도해 주세요'

// SCR-10 장소 검색: 입력 → 카카오 키워드 결과. 고르는 순간이 확인이다(호출 쪽이 POST /places)
const PlaceSearchPanel = ({ onSelect, isBusy = false }: PlaceSearchPanelProps) => {
  const [query, setQuery] = useState('')
  const search = usePlaceSearch(query)
  const results = (search.data ?? []).slice(0, MAX_RESULTS)
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Icon name="search" size={18} color="ink3" />
        <TextInput
          accessibilityLabel="장소 검색어"
          placeholder="다녀온 곳 검색"
          placeholderTextColor={COLORS.ink3}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          style={styles.input}
        />
        {search.isFetching || isBusy ? <ActivityIndicator color={COLORS.ink3} /> : null}
      </View>
      {search.isError ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {searchErrorText(search.error)}
        </AppText>
      ) : null}
      {search.isSuccess && results.length === 0 ? (
        <AppText variant="label" color="ink3">
          찾는 곳이 없어요
        </AppText>
      ) : null}
      {results.map((result) => (
        <Pressable
          key={result.kakaoPlaceId}
          accessibilityRole="button"
          accessibilityLabel={result.name}
          disabled={isBusy}
          onPress={() => onSelect(result)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Icon name="map" size={18} color="ink2" />
          <View style={styles.texts}>
            <AppText variant="labelStrong">{result.name}</AppText>
            {result.address ? (
              <AppText variant="micro" color="ink3">
                {result.address}
              </AppText>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING[2] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  input: { ...TYPOGRAPHY.label, flex: 1, color: COLORS.ink, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressed: { backgroundColor: COLORS.surface },
  texts: { flex: 1, gap: 2 },
})

export default PlaceSearchPanel
