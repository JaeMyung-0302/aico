import { Image } from 'expo-image'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import Toast from '@/design-system/components/Toast'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { type LibraryAsset, listRecentAssets } from '@/modules/media/util-pick-assets/pick-assets'
import { useToast } from '@/shared/hooks/use-toast'

// 열 때 마운트한다(닫으면 언마운트) → 열 때마다 보관함을 처음부터 읽고, 이미 고른 사진으로 시작한다
type PhotoGridPickerProps = {
  // 이미 고른 사진(다시 열면 선택 상태로 시작)
  selected: readonly LibraryAsset[]
  // 이번 기록에 더 담을 수 있는 장수 (20 - 이미 올린 사진)
  maxCount: number
  onClose: () => void
  onConfirm: (assets: LibraryAsset[]) => void
}

const COLUMNS = 3
const GAP = 2
export const PHOTO_LIMIT_MESSAGE = '사진은 한 기록에 20장까지 담을 수 있어요'

// 첫 쪽은 커서 없음 (함수로 두어 타입이 undefined 로 좁혀지지 않게 한다)
const firstPage = (): string | undefined => undefined

// 보관함 최근 사진을 쪽 단위로 불러온다(끝까지 내리면 다음 쪽). 닫으면 버려서 열 때마다 새로 읽는다
const useLibraryPages = () => {
  const query = useInfiniteQuery({
    queryKey: ['media-library', 'recent'],
    queryFn: ({ pageParam }) => listRecentAssets({ after: pageParam }),
    initialPageParam: firstPage(),
    getNextPageParam: (last) => (last.hasNextPage ? last.endCursor : undefined),
    staleTime: 0,
    gcTime: 0,
  })
  const assets = query.data?.pages.flatMap((page) => page.assets) ?? []
  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage().catch(() => undefined)
  }
  return { assets, loadMore }
}

// SCR-05 사진 고르기: 3열 그리드, 고른 순서 번호. 상한을 넘기면 안내만 하고 담지 않는다
const PhotoGridPicker = ({ selected, maxCount, onClose, onConfirm }: PhotoGridPickerProps) => {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS
  const { assets, loadMore } = useLibraryPages()
  const [picked, setPicked] = useState<LibraryAsset[]>(() => [...selected])
  const toast = useToast()

  const handleCellPress = (asset: LibraryAsset) => {
    if (picked.some((item) => item.id === asset.id)) {
      setPicked(picked.filter((item) => item.id !== asset.id))
      return
    }
    if (picked.length >= maxCount) {
      toast.show(PHOTO_LIMIT_MESSAGE)
      return
    }
    setPicked([...picked, asset])
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.icon}>
            <Icon name="close" />
          </Pressable>
          <AppText variant="bodyStrong">사진 선택</AppText>
          <Button
            label={`추가 ${picked.length}`}
            size="md"
            disabled={picked.length === 0}
            onPress={() => onConfirm(picked)}
            style={styles.confirm}
          />
        </View>
        <FlatList
          data={assets}
          keyExtractor={(asset) => asset.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + SPACING[6] }]}
          onEndReached={loadMore}
          renderItem={({ item, index }) => {
            const order = picked.findIndex((asset) => asset.id === item.id)
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`사진 ${index + 1}`}
                accessibilityState={{ selected: order >= 0 }}
                onPress={() => handleCellPress(item)}
                style={{ width: size, height: size }}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={[styles.fill, { backgroundColor: PHOTO_PLACEHOLDER[index % PHOTO_PLACEHOLDER.length] }]}
                  contentFit="cover"
                />
                <View style={[styles.badge, order >= 0 ? styles.badgeOn : null]}>
                  {order >= 0 ? (
                    <AppText variant="micro" color="bg">
                      {String(order + 1)}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            )
          }}
        />
        <Toast message={toast.message} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[3],
  },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  confirm: { paddingHorizontal: SPACING[4], height: 36 },
  grid: { gap: GAP },
  row: { gap: GAP },
  fill: { flex: 1 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.photoBadge,
  },
  badgeOn: { backgroundColor: COLORS.accent },
})

export default PhotoGridPicker
