import type { Conversation, Post } from '@miri-pet/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import BottomSheet from '@/design-system/components/BottomSheet'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { sendMessage } from '../data-access-dm/dm-api'
import { DM_QUERY_KEY } from '../data-access-dm/query-keys'
import { useConversations } from '../data-access-dm/useConversations'
import { createClientMessageId, postShareBody } from '../util-dm/dm-display'

type ShareToDmButtonProps = { post: Pick<Post, 'id' | 'author' | 'caption'> }

// 시트가 열렸을 때만 대화 목록을 불러온다
const ConversationPicker = ({ post, onSent }: ShareToDmButtonProps & { onSent: () => void }) => {
  const queryClient = useQueryClient()
  const conversations = useConversations('ACCEPTED')
  const share = useMutation({
    mutationFn: (conversation: Conversation) =>
      sendMessage(conversation.id, { clientMessageId: createClientMessageId(), body: postShareBody(post) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DM_QUERY_KEY }).catch(() => undefined)
      onSent()
    },
  })
  const items = conversations.data?.pages.flatMap((page) => page.items) ?? []

  if (conversations.isPending) return <ActivityIndicator color={COLORS.primary} />
  if (items.length === 0) {
    return (
      <AppText variant="callout" color="ink2" style={styles.center}>
        공유할 대화가 없어요
      </AppText>
    )
  }
  return (
    <View>
      {items.map((conversation) => (
        <Pressable
          key={conversation.id}
          accessibilityRole="button"
          accessibilityLabel={`${conversation.peer.nickname}에게 보내기`}
          disabled={share.isPending}
          onPress={() => share.mutate(conversation)}
          style={styles.row}
        >
          <Avatar name={conversation.peer.nickname} uri={conversation.peer.avatarUrl} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {conversation.peer.nickname}
          </AppText>
          <Icon name="send" size={20} color="primary" />
        </Pressable>
      ))}
      {share.isError ? (
        <AppText variant="callout" color="danger" style={styles.center}>
          보내지 못했어요. 다시 시도해 주세요
        </AppText>
      ) : null}
    </View>
  )
}

// 04 PostCard: 게시물을 DM으로 공유 (앱 링크 메시지 → 대화방 말풍선이 게시물로 이동)
const ShareToDmButton = ({ post }: ShareToDmButtonProps) => {
  const [step, setStep] = useState<'closed' | 'pick' | 'sent'>('closed')
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="DM으로 공유"
        onPress={() => setStep('pick')}
        style={styles.iconButton}
      >
        <Icon name="send" />
      </Pressable>
      <BottomSheet isVisible={step !== 'closed'} onClose={() => setStep('closed')}>
        <AppText variant="title3" accessibilityRole="header" style={styles.title}>
          {step === 'sent' ? '보냈어요' : '누구에게 보낼까요?'}
        </AppText>
        {step === 'pick' ? <ConversationPicker post={post} onSent={() => setStep('sent')} /> : null}
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  iconButton: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: SPACING.sm },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  flex: { flex: 1 },
  center: { textAlign: 'center', paddingVertical: SPACING.lg },
})

export default ShareToDmButton
