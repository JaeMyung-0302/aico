import type { UserSummary } from '@miri-pet/shared'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'

type BlockedUsersSheetProps = {
  isVisible: boolean
  onClose: () => void
  users: UserSummary[]
  onUnblock: (userId: string) => void
  // 해제 처리 중인 사용자 id
  pendingUserId: string | null
}

const BlockedUsersSheet = ({ isVisible, onClose, users, onUnblock, pendingUserId }: BlockedUsersSheetProps) => (
  <BottomSheet isVisible={isVisible} onClose={onClose}>
    <AppText variant="title3" accessibilityRole="header" style={styles.title}>
      차단한 사용자
    </AppText>
    {users.length === 0 ? (
      <AppText variant="callout" color="ink2" style={styles.empty}>
        차단한 사용자가 없어요
      </AppText>
    ) : (
      users.map((user) => (
        <View key={user.id} style={styles.row}>
          <Avatar name={user.nickname} uri={user.avatarUrl} size={40} />
          <AppText variant="bodyStrong" style={styles.name} numberOfLines={1}>
            {user.nickname}
          </AppText>
          <Button
            label="차단 해제"
            variant="secondary"
            size="md"
            accessibilityHint={`${user.nickname} 님 차단을 풀어요`}
            isLoading={pendingUserId === user.id}
            disabled={pendingUserId !== null}
            onPress={() => onUnblock(user.id)}
          />
        </View>
      ))
    )}
  </BottomSheet>
)

const styles = StyleSheet.create({
  title: { marginBottom: SPACING.sm },
  empty: { paddingVertical: SPACING.xxl, textAlign: 'center' },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  name: { flex: 1 },
})

export default BlockedUsersSheet
