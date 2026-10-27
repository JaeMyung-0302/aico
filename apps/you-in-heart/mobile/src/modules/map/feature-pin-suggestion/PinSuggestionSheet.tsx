import type { CreatePlaceRequest, PlaceSearchResult } from '@you-in-heart/shared'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import PlaceSearchPanel from '../ui-place-search/PlaceSearchPanel'
import type { PhotoCluster } from '../util-pin-suggestion/cluster-photo-locations'
import { useSavePins } from './useSavePins'

// 사진 위치로 묶은 곳 + 역지오코딩 이름·주소
export type PinSuggestion = PhotoCluster & { name: string; address: string | null }

type PinSuggestionSheetProps = {
  isVisible: boolean
  entryId: string
  suggestions: readonly PinSuggestion[]
  // 사진 위치를 쓸 수 없는 기기(plan 2B.3 Android 분기): 제안 없이 직접 고르기만
  isManualOnly: boolean
  onClose: () => void
  onDone: () => void
  onPickOnMap: () => void
}

const SAVE_ERROR = '장소를 남기지 못했어요. 잠시 후 다시 시도해 주세요'

const shortDate = (kstDate: string) => kstDate.slice(5).replace('-', '. ')

const toRequest = ({ name, lat, lng, address }: PinSuggestion): CreatePlaceRequest => ({
  name,
  lat,
  lng,
  ...(address ? { address } : {}),
})

const fromSearch = ({ name, lat, lng, kakaoPlaceId, address }: PlaceSearchResult): CreatePlaceRequest => ({
  name: name.slice(0, 50),
  lat,
  lng,
  kakaoPlaceId,
  ...(address ? { address } : {}),
})

type SuggestionRowProps = { suggestion: PinSuggestion; isChecked: boolean; onToggle: () => void }

const SuggestionRow = ({ suggestion, isChecked, onToggle }: SuggestionRowProps) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={suggestion.name}
    accessibilityState={{ checked: isChecked }}
    onPress={onToggle}
    style={styles.row}
  >
    <View style={[styles.box, isChecked ? styles.boxOn : null]}>
      {isChecked ? <Icon name="check" size={14} color="bg" strokeWidth={3} /> : null}
    </View>
    <View style={styles.texts}>
      <AppText variant="body">{suggestion.name}</AppText>
      <AppText variant="micro" color="ink3" style={styles.sub}>
        {`${shortDate(suggestion.kstDate)} · 사진 ${suggestion.assetIds.length}장`}
      </AppText>
    </View>
  </Pressable>
)

const ManualOnly = ({ onPickOnMap, onClose }: { onPickOnMap: () => void; onClose: () => void }) => (
  <>
    <AppText variant="heading" accessibilityRole="header">
      다녀온 곳을 지도에 남겨볼까요?
    </AppText>
    <AppText variant="caption" color="ink2">
      이 기기에서는 사진 위치를 읽을 수 없어요. 지도에서 직접 골라 주세요.
    </AppText>
    <Button label="지도에서 직접 고르기" onPress={onPickOnMap} />
    <Button label="나중에" variant="text" size="md" onPress={onClose} />
  </>
)

// SCR-10 "사진 위치로 찾은 장소 확인": 모두 고른 상태로 시작, 확인 버튼을 눌러야 POST /places
const PinSuggestionSheet = ({ isVisible, entryId, suggestions, isManualOnly, onClose, onDone, onPickOnMap }: PinSuggestionSheetProps) => {
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const save = useSavePins()
  const selected = suggestions.filter((suggestion) => !unchecked.has(suggestion.key))

  const toggle = (key: string) =>
    setUnchecked((current) =>
      current.has(key) ? new Set([...current].filter((item) => item !== key)) : new Set([...current, key]),
    )
  const submit = (places: readonly CreatePlaceRequest[]) => save.mutate({ entryId, places }, { onSuccess: onDone })

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      {isManualOnly ? <ManualOnly onPickOnMap={onPickOnMap} onClose={onClose} /> : null}
      {!isManualOnly && isSearching ? (
        <PlaceSearchPanel isBusy={save.isPending} onSelect={(result) => submit([fromSearch(result)])} />
      ) : null}
      {!isManualOnly && !isSearching ? (
        <>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">
            {`새로 다녀온 곳 ${suggestions.length}곳을 찾았어요`}
          </AppText>
          <AppText variant="caption" color="ink2">
            최근 기록의 사진 위치예요. 지도에 남길 곳만 골라주세요.
          </AppText>
          <View>
            {suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.key}
                suggestion={suggestion}
                isChecked={!unchecked.has(suggestion.key)}
                onToggle={() => toggle(suggestion.key)}
              />
            ))}
          </View>
          <Button
            label={selected.length > 0 ? `${selected.length}곳 지도에 남기기` : '지도에 남기기'}
            disabled={selected.length === 0}
            isLoading={save.isPending}
            onPress={() => submit(selected.map(toRequest))}
          />
          <View style={styles.links}>
            <Button label="다른 장소 검색" variant="text" size="md" onPress={() => setIsSearching(true)} />
            <Button label="나중에" variant="text" size="md" onPress={onClose} />
          </View>
        </>
      ) : null}
      {save.isError ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {SAVE_ERROR}
        </AppText>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  texts: { flex: 1 },
  sub: { fontSize: 12 },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
})

export default PinSuggestionSheet
