import type { Conversation, MemberState } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useBlockUser } from '@/modules/moderation/data-access-moderation/useModeration'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { formatRelativeTime } from '@/shared/format/format-relative-time'
import { useAcceptConversation, useConversations, useHideConversation } from '../data-access-dm/useConversations'
import { conversationPreview } from '../util-dm/dm-display'

const REQUEST_NOTICE = '서로 팔로우하지 않은 사람의 메시지예요. 수락하기 전에는 상대가 내 읽음 여부를 알 수 없어요.'
const BLOCK_FAILURE_MESSAGE = '차단하지 못했어요. 잠시 후 다시 시도해 주세요'

const openChat = (conversationId: string) => router.push(`/dm/${conversationId}`)

const ConversationRow = ({ item, meId }: { item: Conversation; meId: string | undefined }) => {
  const isUnread = item.unreadCount > 0
  return (
    <Pressable accessibilityRole="button" onPress={() => openChat(item.id)} style={styles.row}>
      <Avatar name={item.peer.nickname} uri={item.peer.avatarUrl} size={52} />
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {item.peer.nickname}
        </AppText>
        <AppText variant={isUnread ? 'calloutStrong' : 'callout'} color={isUnread ? 'ink' : 'ink3'} numberOfLines={1}>
          {conversationPreview(item.lastMessage, meId)}
        </AppText>
      </View>
      <View style={styles.rowMeta}>
        {item.lastMessage ? (
          <AppText variant="caption" color="ink3">
            {formatRelativeTime(item.lastMessage.createdAt)}
          </AppText>
        ) : null}
        {isUnread ? (
          <View accessibilityLabel={`안 읽은 메시지 ${item.unreadCount}개`} style={styles.badge}>
            <AppText variant="captionStrong" color="surface">
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

type RequestCardProps = { item: Conversation; onBlock: (item: Conversation) => void }

const RequestCard = ({ item, onBlock }: RequestCardProps) => {
  const accept = useAcceptConversation()
  const hide = useHideConversation()
  const name = item.peer.nickname
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={() => openChat(item.id)} style={styles.cardHead}>
        <Avatar name={name} uri={item.peer.avatarUrl} size={48} />
        <View style={styles.rowText}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="callout" color="ink2" numberOfLines={2}>
            {conversationPreview(item.lastMessage, undefined)}
          </AppText>
        </View>
      </Pressable>
      <View style={styles.cardActions}>
        <CardAction label="차단" a11y={`${name} 차단`} tone="danger" onPress={() => onBlock(item)} />
        <CardAction label="삭제" a11y={`${name} 요청 삭제`} tone="ink" onPress={() => hide.mutate(item.id)} />
        <CardAction label="수락" a11y={`${name} 요청 수락`} tone="primary" onPress={() => accept.mutate(item.id)} />
      </View>
    </View>
  )
}

type CardActionProps = { label: string; a11y: string; tone: 'danger' | 'ink' | 'primary'; onPress: () => void }

const CardAction = ({ label, a11y, tone, onPress }: CardActionProps) => {
  const isPrimary = tone === 'primary'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[styles.cardAction, isPrimary ? styles.cardActionPrimary : styles.cardActionOutline]}
    >
      <AppText variant="calloutStrong" color={isPrimary ? 'surface' : tone}>
        {label}
      </AppText>
    </Pressable>
  )
}

const TabButton = ({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="tab"
    accessibilityLabel={label}
    accessibilityState={{ selected: isActive }}
    onPress={onPress}
    style={[styles.tab, isActive ? styles.tabActive : null]}
  >
    <AppText variant={isActive ? 'bodyStrong' : 'body'} color={isActive ? 'ink' : 'ink3'}>
      {label}
    </AppText>
  </Pressable>
)

type DmInboxScreenProps = {
  // 알림(메시지 요청)에서 열 탭 — 탭 화면이 이미 떠 있어도 바꾼다
  requestedTab?: MemberState
}

// 12 DmInbox: 대화 / 요청 세그먼트, 안 읽은 수 배지, 요청 카드(차단·삭제·수락)
const DmInboxScreen = ({ requestedTab }: DmInboxScreenProps) => {
  const [tab, setTab] = useState<MemberState>(requestedTab ?? 'ACCEPTED')
  const [blockTarget, setBlockTarget] = useState<Conversation | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const me = useMe()
  const chats = useConversations('ACCEPTED')
  const requests = useConversations('REQUEST')
  const blockUser = useBlockUser()
  const active = tab === 'ACCEPTED' ? chats : requests
  const items = active.data?.pages.flatMap((page) => page.items) ?? []
  const requestCount = requests.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0

  // 탭 화면이 이미 떠 있을 때 들어온 요청도 반영한다 (렌더 중 prop 변화에 맞춰 조정)
  const [appliedRequest, setAppliedRequest] = useState(requestedTab)
  if (requestedTab !== appliedRequest) {
    setAppliedRequest(requestedTab)
    if (requestedTab) setTab(requestedTab)
  }
  // 같은 링크로 다시 들어와도 탭이 바뀌도록 처리한 파라미터는 지운다
  useEffect(() => {
    if (requestedTab) router.setParams({ tab: undefined })
  }, [requestedTab])

  const handleBlockConfirm = async () => {
    if (!blockTarget) return
    setBlockError(null)
    try {
      await blockUser.mutateAsync(blockTarget.peer.id)
      setBlockTarget(null)
    } catch {
      // 실패하면 확인 창에 머물러 다시 누를 수 있게 한다
      setBlockError(BLOCK_FAILURE_MESSAGE)
    }
  }
  const handleBlockClose = () => {
    setBlockTarget(null)
    setBlockError(null)
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="대화" hasBack={false} />
      <View style={styles.tabs}>
        <TabButton label="대화" isActive={tab === 'ACCEPTED'} onPress={() => setTab('ACCEPTED')} />
        <TabButton
          label={requestCount > 0 ? `요청 ${requestCount}` : '요청'}
          isActive={tab === 'REQUEST'}
          onPress={() => setTab('REQUEST')}
        />
      </View>
      {active.isPending ? <ActivityIndicator style={styles.loading} color={COLORS.primary} /> : null}
      {active.isError ? (
        <EmptyLayout
          title="대화를 불러오지 못했어요"
          onRetry={() => {
            active.refetch().catch(() => undefined)
          }}
        />
      ) : null}
      {active.isSuccess && items.length === 0 ? (
        tab === 'ACCEPTED' ? (
          <EmptyLayout title="아직 대화가 없어요" description="프로필에서 메시지를 보내 대화를 시작해 보세요." />
        ) : (
          <EmptyLayout title="받은 메시지 요청이 없어요" />
        )
      ) : null}
      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            tab === 'REQUEST' ? (
              <AppText variant="caption" color="ink2" style={styles.notice}>
                {REQUEST_NOTICE}
              </AppText>
            ) : null
          }
          renderItem={({ item }) =>
            tab === 'ACCEPTED' ? (
              <ConversationRow item={item} meId={me.data?.id} />
            ) : (
              <RequestCard item={item} onBlock={setBlockTarget} />
            )
          }
          onEndReached={() => {
            if (active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage().catch(() => undefined)
          }}
          refreshing={active.isRefetching && !active.isFetchingNextPage}
          onRefresh={() => {
            active.refetch().catch(() => undefined)
          }}
        />
      ) : null}
      <Dialog
        isVisible={blockTarget !== null}
        onClose={handleBlockClose}
        title={`${blockTarget?.peer.nickname ?? ''} 님을 차단할까요?`}
        description="서로 메시지를 보낼 수 없고, 서로의 게시물·프로필이 보이지 않아요."
        actions={
          <>
            <Button label="취소" variant="secondary" size="md" style={styles.flex} onPress={handleBlockClose} />
            <Button
              label="차단하기"
              variant="danger"
              size="md"
              style={styles.flex}
              isLoading={blockUser.isPending}
              onPress={handleBlockConfirm}
            />
          </>
        }
      >
        {blockError ? (
          <AppText variant="callout" color="danger" accessibilityLiveRegion="polite">
            {blockError}
          </AppText>
        ) : null}
      </Dialog>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  loading: { marginTop: SPACING.xxxl },
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 2,
  },
  rowText: { flex: 1, gap: SPACING.xxs },
  rowMeta: { alignItems: 'flex-end', gap: SPACING.xs + 2 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md + 2, paddingBottom: SPACING.xs },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cardActions: { flexDirection: 'row', gap: SPACING.sm },
  cardAction: { flex: 1, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardActionOutline: { borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface },
  cardActionPrimary: { backgroundColor: COLORS.primary },
})

export default DmInboxScreen
