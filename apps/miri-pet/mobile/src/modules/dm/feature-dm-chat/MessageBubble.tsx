import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { parsePostShare } from '../util-dm/dm-display'

const IMAGE_SIZE = 180
const BUBBLE_MAX_WIDTH = 260

type MessageBubbleProps = {
  body: string | null
  imageUri: string | null
  isMine: boolean
  // 내 메시지 아래 상태(읽음·전송됨·전송 중·실패)
  status?: string | null
  onStatusPress?: () => void
  onLongPress?: () => void
}

const openPost = (postId: string) => router.push(`/posts/${postId}`)

// 13 말풍선: 내 것 오른쪽 파랑, 상대 왼쪽 흰색. 공유된 게시물 링크는 눌러서 게시물로 이동
const MessageBubble = ({ body, imageUri, isMine, status, onStatusPress, onLongPress }: MessageBubbleProps) => {
  const sharedPostId = parsePostShare(body)
  const text = body ?? (imageUri ? null : '삭제된 메시지예요')
  return (
    <View style={[styles.wrap, isMine ? styles.mineWrap : styles.theirsWrap]}>
      <Pressable
        accessibilityRole={sharedPostId ? 'button' : undefined}
        accessibilityLabel={sharedPostId ? '공유된 게시물 보기' : undefined}
        disabled={!sharedPostId && !onLongPress}
        onPress={sharedPostId ? () => openPost(sharedPostId) : undefined}
        onLongPress={onLongPress}
        style={styles.content}
      >
        {imageUri ? (
          <Image accessibilityLabel="보낸 사진" source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
        ) : null}
        {text ? (
          <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
            <AppText variant="body" color={isMine ? 'surface' : body ? 'ink' : 'ink3'}>
              {text}
            </AppText>
          </View>
        ) : null}
      </Pressable>
      {status ? (
        <Pressable
          accessibilityRole={onStatusPress ? 'button' : undefined}
          disabled={!onStatusPress}
          onPress={onStatusPress}
        >
          <AppText variant="caption" color={onStatusPress ? 'danger' : 'ink2'}>
            {status}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xxs, marginVertical: SPACING.xs },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  content: { gap: SPACING.xs },
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md + 2,
  },
  mine: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: SPACING.xs + 2,
  },
  theirs: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    borderBottomLeftRadius: SPACING.xs + 2,
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: RADIUS.xl },
})

export default MessageBubble
