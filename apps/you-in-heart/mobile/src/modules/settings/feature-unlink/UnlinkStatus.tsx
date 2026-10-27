import type { Couple } from '@you-in-heart/shared'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useNow } from '@/shared/hooks/use-now'
import { daysUntilPurge, formatKstDotDate } from './unlink-dates'

type UnlinkStatusProps = {
  couple: Couple
  myUserId: string
  isReconnecting: boolean
  onReconnect: () => void
}

type ReconnectState = 'request' | 'accept' | 'waiting'

// 한 명만 확인하면 UNLINKING 유지 — 내가 확인했으면 대기, 상대가 먼저 확인했으면 수락
const toReconnectState = (couple: Couple, myUserId: string): ReconnectState => {
  const mine = couple.members.find((member) => member.userId === myUserId)
  const partner = couple.members.find((member) => member.userId !== myUserId)
  if (mine?.reconnectConfirmedAt) return 'waiting'
  return partner?.reconnectConfirmedAt ? 'accept' : 'request'
}

const RECONNECT_LABEL: Record<ReconnectState, string> = {
  request: '다시 연결 요청',
  accept: '다시 연결 수락',
  waiting: '상대의 수락을 기다리는 중',
}

const describeRequest = (couple: Couple): string | null => {
  if (!couple.unlinkRequestedAt) return null
  const requester = couple.members.find((member) => member.userId === couple.unlinkRequestedBy)
  return `${requester?.displayName ?? '상대'}님이 ${formatKstDotDate(couple.unlinkRequestedAt)}에 해제를 요청했어요`
}

// SCR-16 유예 중 · 다시 연결 (TODO(2C): 내보내기 진행 카드)
const UnlinkStatus = ({ couple, myUserId, isReconnecting, onReconnect }: UnlinkStatusProps) => {
  const reconnectState = toReconnectState(couple, myUserId)
  const request = describeRequest(couple)
  const now = useNow(60_000)
  return (
    <View style={styles.wrap}>
      <View style={styles.countdown}>
        <AppText variant="caption" color="ink3">
          삭제까지
        </AppText>
        <AppText variant="display" style={styles.days}>
          {String(couple.purgeAfter ? daysUntilPurge(couple.purgeAfter, now) : 0)}
          <AppText variant="title">일</AppText>
        </AppText>
        {request ? (
          <AppText variant="caption" color="ink2">
            {request}
          </AppText>
        ) : null}
      </View>
      <View style={styles.card}>
        <AppText variant="bodyStrong">다시 연결하기</AppText>
        <AppText variant="caption" color="ink2">
          둘 중 한 사람이 요청하고 상대가 수락하면, 모든 기록이 그대로 돌아와요.
        </AppText>
        <Button
          label={RECONNECT_LABEL[reconnectState]}
          size="md"
          disabled={reconnectState === 'waiting'}
          isLoading={isReconnecting}
          onPress={onReconnect}
          style={styles.reconnect}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 18, paddingHorizontal: SPACING.screen, paddingTop: SPACING[2] },
  countdown: { alignItems: 'center', gap: 6, paddingVertical: SPACING[6] },
  days: { fontSize: 52, lineHeight: 57 },
  card: { gap: SPACING[2], padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  reconnect: { alignSelf: 'flex-start', marginTop: SPACING[1] },
})

export default UnlinkStatus
