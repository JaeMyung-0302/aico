import type { UserProfile } from '@miri-pet/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { StyleSheet } from 'react-native'
import Button from '@/design-system/components/Button'
import { FEED_QUERY_KEY } from '@/modules/feed/data-access-feed/useFeed'
import { userProfileQueryKey } from '@/modules/user/data-access-user/useUserProfile'
import { followUser, unfollowUser } from '../data-access-social/social-api'

type FollowButtonProps = { profile: Pick<UserProfile, 'id' | 'isFollowing'> }

// 17 팔로우 / 팔로잉 토글. 누르는 즉시 바뀌고(낙관적) 실패하면 원래대로 돌아온다
const FollowButton = ({ profile }: FollowButtonProps) => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (shouldFollow: boolean) => (shouldFollow ? followUser(profile.id) : unfollowUser(profile.id)),
    // 팔로워 수와 홈 피드(팔로잉 ∪ 본인)가 바뀐다
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: userProfileQueryKey(profile.id) }),
        queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY }),
      ]),
  })
  const isFollowing = mutation.isPending
    ? mutation.variables
    : mutation.isSuccess
      ? mutation.data.isFollowing
      : profile.isFollowing

  return (
    <Button
      label={isFollowing ? '팔로잉' : '팔로우'}
      variant={isFollowing ? 'secondary' : 'primary'}
      size="md"
      style={styles.button}
      onPress={() => mutation.mutate(!isFollowing)}
    />
  )
}

const styles = StyleSheet.create({ button: { flex: 1 } })

export default FollowButton
