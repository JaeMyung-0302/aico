import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useMemo } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { FONT_FAMILY } from '@/design-system/tokens/typography'
import { usePhotos } from '../data-access-album/usePhotos'
import { type AlbumRow, groupPhotosByMonth } from '../util-album/group-photos-by-month'

const GAP = 2
const COLUMNS = 3

const openImport = () => router.push('/album/import')

const ImportPill = () => (
  <Pressable accessibilityRole="button" accessibilityLabel="지난 사진 가져오기" onPress={openImport} style={styles.pill}>
    <Icon name="download" size={16} />
    <AppText variant="caption" style={styles.pillLabel}>
      지난 사진 가져오기
    </AppText>
  </Pressable>
)

const EmptyAlbum = () => (
  <View style={styles.empty}>
    <View style={styles.emptyTiles}>
      <View style={[styles.emptyTile, { backgroundColor: COLORS.surface }]} />
      <View style={[styles.emptyTile, { backgroundColor: COLORS.border }]} />
      <View style={[styles.emptyTile, { backgroundColor: COLORS.surface }]} />
    </View>
    <AppText variant="title" style={styles.emptyTitle}>
      아직 사진이 없어요
    </AppText>
    <AppText variant="label" color="ink2" style={styles.center}>
      {'기록에 담은 사진이 여기에 모여요.\n지난 사진을 한 번에 가져올 수도 있어요.'}
    </AppText>
    <Button label="지난 사진 가져오기" size="md" onPress={openImport} style={styles.emptyButton} />
  </View>
)

const PhotoRow = ({ row, size }: { row: Extract<AlbumRow, { type: 'photos' }>; size: number }) => (
  <View style={styles.row}>
    {row.photos.map((photo, index) => (
      <Pressable
        key={photo.id}
        testID={`album-cell-${photo.id}`}
        accessibilityRole="button"
        accessibilityLabel="사진 보기"
        onPress={() => router.push(`/photos/${photo.id}`)}
      >
        <Image
          testID={`album-thumb-${photo.id}`}
          source={photo.thumbUrl ? { uri: photo.thumbUrl, cacheKey: `${photo.id}:t` } : null}
          style={{ width: size, height: size, backgroundColor: PHOTO_PLACEHOLDER[index % PHOTO_PLACEHOLDER.length] }}
          contentFit="cover"
        />
      </Pressable>
    ))}
  </View>
)

// SCR-08 앨범: 촬영 달별 3열 그리드(간격 2), 끝까지 내리면 다음 쪽. 사진을 누르면 SCR-09 뷰어
const AlbumScreen = () => {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS
  const photos = usePhotos()
  const items = useMemo(() => photos.data?.pages.flatMap((page) => page.items) ?? [], [photos.data])
  const rows = useMemo(() => groupPhotosByMonth(items), [items])
  const isEmpty = photos.isSuccess && items.length === 0

  if (photos.isError && items.length === 0) {
    return <EmptyLayout icon="alert" title="잠시 문제가 생겼어요" description="잠시 뒤 다시 시도해 주세요." onRetry={() => photos.refetch()} />
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppText variant="title">앨범</AppText>
        {isEmpty ? null : <ImportPill />}
      </View>
      {isEmpty ? (
        <EmptyAlbum />
      ) : (
        <FlatList
          testID="album-list"
          data={rows}
          keyExtractor={(row) => row.key}
          onEndReached={() => {
            if (photos.hasNextPage && !photos.isFetchingNextPage) photos.fetchNextPage().catch(() => undefined)
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: SPACING[8] }}
          renderItem={({ item }) =>
            item.type === 'month' ? (
              <AppText variant="captionStrong" style={styles.month}>
                {item.label}
              </AppText>
            ) : (
              <PhotoRow row={item} size={size} />
            )
          }
          ListFooterComponent={photos.isFetchingNextPage ? <ActivityIndicator color={COLORS.ink3} /> : null}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    height: 52,
    paddingHorizontal: SPACING.screen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  pillLabel: { fontFamily: FONT_FAMILY.medium },
  month: { paddingTop: SPACING[4], paddingHorizontal: SPACING.screen, paddingBottom: SPACING[2] },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[3], paddingHorizontal: 40, paddingBottom: 140 },
  emptyTiles: { flexDirection: 'row', gap: SPACING[1], marginBottom: SPACING[2] },
  emptyTile: { width: 40, height: 40, borderRadius: 6 },
  emptyTitle: { fontSize: 20 },
  center: { textAlign: 'center' },
  emptyButton: { marginTop: SPACING[2], borderRadius: RADIUS.pill },
})

export default AlbumScreen
