import type { Quote } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useDeleteQuote, useQuotes } from '../data-access-quote/useQuotes'
import ScreenshotSaveSheet from '../feature-screenshot-save/ScreenshotSaveSheet'
import QuoteEmptyState, { AddWays } from './QuoteEmptyState'
import QuoteFilterChips, { type QuoteFilter } from './QuoteFilterChips'
import QuoteListCard from './QuoteListCard'

type Sheet = { kind: 'none' } | { kind: 'add' } | { kind: 'screenshot' } | { kind: 'actions'; quote: Quote }

const matches = (quote: Quote, filter: QuoteFilter): boolean => {
  if (filter.kind === 'screenshot') return quote.source === 'SCREENSHOT'
  if (filter.kind === 'speaker') return quote.speakerLabel === filter.name
  return true
}

// 두 사람 표시 이름(거르기 칩). 공유·가져오기에서 고른 보낸 사람 이름과 같다
const useCoupleNames = (): string[] => {
  const me = useMe()
  const couple = useCouple({ isEnabled: Boolean(me.data?.couple) })
  const mine = me.data?.displayName
  const partner = couple.data?.members.find((member) => member.userId !== me.data?.id)?.displayName
  return [mine, partner].filter((name): name is string => Boolean(name))
}

// SCR-13 문구 보관함: 카드 목록(텍스트·스크린샷), 거르기, 추가(공유 안내·txt·스크린샷), 지우기
const QuoteBoxScreen = () => {
  const insets = useSafeAreaInsets()
  const quotes = useQuotes()
  const remove = useDeleteQuote()
  const names = useCoupleNames()
  const [filter, setFilter] = useState<QuoteFilter>({ kind: 'all' })
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })
  const items = quotes.data?.pages.flatMap((page) => page.items) ?? []
  const visible = items.filter((quote) => matches(quote, filter))
  const close = () => setSheet({ kind: 'none' })
  const openImport = () => {
    close()
    router.push('/quotes/import')
  }
  const loadMore = () => {
    if (quotes.hasNextPage && !quotes.isFetchingNextPage) quotes.fetchNextPage().catch(() => undefined)
  }

  const addButton = (
    <Pressable accessibilityRole="button" accessibilityLabel="문구 추가" onPress={() => setSheet({ kind: 'add' })} style={styles.icon}>
      <Icon name="plus" />
    </Pressable>
  )

  return (
    <View style={styles.screen}>
      <AppHeader right={items.length > 0 ? addButton : undefined} />
      {quotes.isError ? <EmptyLayout icon="alert" title="보관함을 불러오지 못했어요" onRetry={() => quotes.refetch()} /> : null}
      {quotes.isSuccess && items.length === 0 ? (
        <View style={styles.body}>
          <QuoteEmptyState onImport={openImport} onScreenshot={() => setSheet({ kind: 'screenshot' })} />
        </View>
      ) : null}
      {items.length > 0 ? (
        <FlatList
          data={visible}
          keyExtractor={(quote) => quote.id}
          contentContainerStyle={[styles.body, styles.list, { paddingBottom: insets.bottom + SPACING[8] }]}
          ListHeaderComponent={
            <View style={styles.head}>
              <View style={styles.titleRow}>
                <AppText variant="title" style={styles.heading} accessibilityRole="header">
                  간직한 문구
                </AppText>
                {quotes.hasNextPage ? null : (
                  <AppText variant="caption" color="ink3">{`${items.length}개`}</AppText>
                )}
              </View>
              <QuoteFilterChips names={names} value={filter} onChange={setFilter} />
            </View>
          }
          renderItem={({ item }) => <QuoteListCard quote={item} onMorePress={() => setSheet({ kind: 'actions', quote: item })} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={quotes.isFetchingNextPage ? <ActivityIndicator color={COLORS.ink3} /> : null}
        />
      ) : null}
      <BottomSheet isVisible={sheet.kind === 'add'} onClose={close}>
        <AddWays onImport={openImport} onScreenshot={() => setSheet({ kind: 'screenshot' })} />
      </BottomSheet>
      <BottomSheet isVisible={sheet.kind === 'actions'} onClose={close}>
        <Button
          label="지우기"
          variant="danger"
          isLoading={remove.isPending}
          onPress={() => (sheet.kind === 'actions' ? remove.mutate(sheet.quote.id, { onSuccess: close }) : undefined)}
        />
        {remove.isError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            지우지 못했어요. 잠시 후 다시 시도해 주세요
          </AppText>
        ) : null}
        <Button label="닫기" variant="outline" onPress={close} />
      </BottomSheet>
      {sheet.kind === 'screenshot' ? <ScreenshotSaveSheet isVisible initialUri={null} onClose={close} onSaved={close} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[1] },
  list: { gap: 14 },
  head: { gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heading: { fontSize: 24 },
})

export default QuoteBoxScreen
