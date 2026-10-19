import type { Conversation, Message, ReportReason } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import KeyboardAvoider from '@/design-system/components/KeyboardAvoider'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import { PHOTO_PERMISSION_MESSAGE, pickImageOrNull } from '@/modules/media/util-pick-image/pick-image-or-null'
import { useBlockUser, useCreateReport } from '@/modules/moderation/data-access-moderation/useModeration'
import ReportSheet from '@/modules/moderation/ui-report-sheet/ReportSheet'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useAcceptConversation, useConversation, useHideConversation } from '../data-access-dm/useConversations'
import { useMarkRead, useMessages } from '../data-access-dm/useMessages'
import { type PendingMessage, useSendMessage } from '../data-access-dm/useSendMessage'
import { myReadLabel } from '../util-dm/dm-display'
import MessageBubble from './MessageBubble'

type DmChatScreenProps = { conversationId: string }

type Row = { kind: 'pending'; item: PendingMessage } | { kind: 'message'; item: Message }

type ReportTarget = { type: 'USER' | 'MESSAGE'; id: string }

const RETRY_LATER = '잠시 후 다시 시도해 주세요.'

const rowKey = (row: Row) => (row.kind === 'pending' ? `pending:${row.item.clientMessageId}` : row.item.id)

const pendingStatus = (item: PendingMessage) => (item.status === 'sending' ? '전송 중' : '전송 실패 · 다시 보내기')

// 받은 메시지 중 가장 최근 것(최신순 목록의 첫 상대 메시지)
const newestIncomingId = (messages: readonly Message[], meId: string | undefined): string | null =>
  messages.find((message) => message.senderId !== meId)?.id ?? null

const RequestBanner = ({ conversation }: { conversation: Conversation }) => {
  const accept = useAcceptConversation()
  const hide = useHideConversation()
  const handleDecline = async () => {
    try {
      await hide.mutateAsync(conversation.id)
    } catch {
      Alert.alert('요청을 삭제하지 못했어요', RETRY_LATER)
      return
    }
    if (router.canGoBack()) router.back()
  }
  const handleAccept = () =>
    accept.mutate(conversation.id, { onError: () => Alert.alert('요청을 수락하지 못했어요', RETRY_LATER) })
  return (
    <View style={styles.banner}>
      <AppText variant="callout" color="ink2">
        {`${conversation.peer.nickname} 님의 메시지 요청이에요. 수락하면 대화 목록으로 옮겨지고 상대가 읽음 여부를 볼 수 있어요.`}
      </AppText>
      <View style={styles.bannerActions}>
        <Button label="삭제" variant="secondary" size="md" style={styles.flex} onPress={handleDecline} />
        <Button label="수락" size="md" style={styles.flex} isLoading={accept.isPending} onPress={handleAccept} />
      </View>
    </View>
  )
}

// 13 DmChat: 텍스트·사진, 읽음 표시, 요청 수락 배너, … → 사용자 신고·차단, 상대 메시지 길게 → 메시지 신고
const DmChatScreen = ({ conversationId }: DmChatScreenProps) => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  const meId = me.data?.id
  const conversation = useConversation(conversationId)
  const messages = useMessages(conversationId)
  const { pending, send, retry } = useSendMessage(conversationId)
  const markRead = useMarkRead(conversationId)
  const createReport = useCreateReport()
  const blockUser = useBlockUser()
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const lastMarkedRef = useRef<string | null>(null)

  const serverMessages = messages.data?.pages.flatMap((page) => page.items) ?? []
  const incomingId = newestIncomingId(serverMessages, meId)
  const { mutate: markReadMutate } = markRead

  // 새로 받은 메시지가 보이면 거기까지 읽음 처리(같은 id는 한 번만)
  useEffect(() => {
    if (!incomingId || !meId || lastMarkedRef.current === incomingId) return
    lastMarkedRef.current = incomingId
    markReadMutate(incomingId)
  }, [incomingId, meId, markReadMutate])

  const peer = conversation.data?.peer
  const peerLastRead = conversation.data?.peerLastReadMessageId ?? null
  const myNewestId = serverMessages.find((message) => message.senderId !== null && message.senderId === meId)?.id
  const rows: Row[] = [
    ...[...pending].reverse().map((item): Row => ({ kind: 'pending', item })),
    ...serverMessages.map((item): Row => ({ kind: 'message', item })),
  ]

  const handleSendPress = () => {
    if (!draft.trim()) return
    send({ body: draft })
    setDraft('')
  }
  const handlePhotoPress = async () => {
    const image = await pickImageOrNull('library', () => setNotice(PHOTO_PERMISSION_MESSAGE))
    if (image) send({ image })
  }
  const handleSubmitReport = async (reason: ReportReason) => {
    if (reportTarget)
      await createReport.mutateAsync({ targetType: reportTarget.type, targetId: reportTarget.id, reason })
  }
  const handleBlock = async () => {
    if (peer) await blockUser.mutateAsync(peer.id)
  }
  const handleSheetClose = () => {
    setReportTarget(null)
    if (blockUser.isSuccess) router.dismissTo('/dm')
  }

  const renderRow = ({ item: row }: { item: Row }) => {
    if (row.kind === 'pending') {
      const item = row.item
      return (
        <MessageBubble
          body={item.body ?? null}
          imageUri={item.image?.uri ?? null}
          isMine
          status={pendingStatus(item)}
          onStatusPress={item.status === 'failed' ? () => retry(item.clientMessageId) : undefined}
        />
      )
    }
    const message = row.item
    const isMine = message.senderId !== null && message.senderId === meId
    return (
      <MessageBubble
        body={message.body}
        imageUri={message.imageUrl}
        isMine={isMine}
        status={isMine && message.id === myNewestId ? myReadLabel(message, peerLastRead) : null}
        onLongPress={
          isMine || !message.senderId ? undefined : () => setReportTarget({ type: 'MESSAGE', id: message.id })
        }
      />
    )
  }

  const moreButton = peer ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="신고 또는 차단"
      onPress={() => setReportTarget({ type: 'USER', id: peer.id })}
      style={styles.iconButton}
    >
      <Icon name="more" color="ink2" />
    </Pressable>
  ) : null

  // 차단하면 캐시 전체를 다시 받는 동안 이 대화가 403이 된다 → 차단 완료 안내를 닫을 때까지 화면을 유지한다
  const isBlockingPeer = blockUser.isPending || blockUser.isSuccess
  if (conversation.isError && !isBlockingPeer) {
    return (
      <View style={styles.screen}>
        <AppHeader title="대화" />
        <EmptyLayout title="대화를 열 수 없어요" description="차단했거나 볼 수 없는 대화예요." />
      </View>
    )
  }

  return (
    <KeyboardAvoider style={styles.screen}>
      <AppHeader title={peer?.nickname} right={moreButton} />
      {conversation.data?.state === 'REQUEST' ? <RequestBanner conversation={conversation.data} /> : null}
      {messages.isPending ? <ActivityIndicator style={styles.loading} color={COLORS.primary} /> : null}
      {messages.isError && !messages.data && !isBlockingPeer ? (
        <View style={styles.loadError}>
          <AppText variant="callout" color="danger">
            메시지를 불러오지 못했어요
          </AppText>
          <Button
            label="다시 시도"
            variant="secondary"
            size="md"
            onPress={() => {
              messages.refetch().catch(() => undefined)
            }}
          />
        </View>
      ) : null}
      <FlatList
        inverted
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={rowKey}
        renderItem={renderRow}
        onEndReached={() => {
          if (messages.hasNextPage && !messages.isFetchingNextPage) messages.fetchNextPage().catch(() => undefined)
        }}
      />
      {notice ? (
        <AppText variant="caption" color="danger" style={styles.notice}>
          {notice}
        </AppText>
      ) : null}
      <View style={[styles.composer, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진 보내기"
          onPress={handlePhotoPress}
          style={styles.roundButton}
        >
          <Icon name="camera" size={20} />
        </Pressable>
        <TextInput
          accessibilityLabel="메시지 입력"
          placeholder="메시지 입력"
          placeholderTextColor={COLORS.ink3}
          value={draft}
          onChangeText={setDraft}
          maxLength={1000}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="보내기"
          accessibilityState={{ disabled: !draft.trim() }}
          disabled={!draft.trim()}
          onPress={handleSendPress}
          style={[styles.roundButton, styles.sendButton]}
        >
          <Icon name="send" size={20} color="surface" />
        </Pressable>
      </View>
      {peer && reportTarget ? (
        <ReportSheet
          isVisible
          onClose={handleSheetClose}
          target={reportTarget}
          author={{ id: peer.id, nickname: peer.nickname }}
          onSubmitReport={handleSubmitReport}
          onBlock={handleBlock}
          onViewProfile={() => {
            setReportTarget(null)
            router.push(`/users/${peer.id}`)
          }}
        />
      ) : null}
    </KeyboardAvoider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  loading: { marginTop: SPACING.xxxl },
  loadError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.dangerSoft,
  },
  flex: { flex: 1 },
  iconButton: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  banner: {
    padding: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.warmSoft,
  },
  bannerActions: { flexDirection: 'row', gap: SPACING.sm },
  list: { flex: 1, backgroundColor: COLORS.ground },
  listContent: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  notice: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    paddingTop: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  roundButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ground,
  },
  sendButton: { backgroundColor: COLORS.primary },
  input: {
    ...TYPOGRAPHY.body,
    flex: 1,
    minHeight: TOUCH_TARGET,
    maxHeight: 120,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.ground,
    color: COLORS.ink,
  },
})

export default DmChatScreen
