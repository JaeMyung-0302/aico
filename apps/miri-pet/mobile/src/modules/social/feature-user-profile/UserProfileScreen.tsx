import type { ReportReason, UserProfile } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useStartConversation } from '@/modules/dm/data-access-dm/useConversations'
import { useBlockUser, useCreateReport } from '@/modules/moderation/data-access-moderation/useModeration'
import { useUserPets } from '@/modules/pets/data-access-pets/usePets'
import ReportSheet from '@/modules/moderation/ui-report-sheet/ReportSheet'
import { useUserPosts } from '@/modules/posts/data-access-posts/usePosts'
import PostGridTile, { GRID_COLUMNS, GRID_GAP } from '@/modules/posts/ui-post-grid/PostGridTile'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useUserProfile } from '@/modules/user/data-access-user/useUserProfile'
import FollowButton from '../ui-follow-button/FollowButton'
import UserPetCard from './UserPetCard'

type UserProfileScreenProps = { userId: string }
type ProfileTab = 'posts' | 'pets'

const TABS: readonly { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: '게시물' },
  { key: 'pets', label: '반려동물' },
]

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View accessible accessibilityLabel={`${label} ${value}`} style={styles.stat}>
    <AppText variant="title3" style={styles.statValue}>
      {value}
    </AppText>
    <AppText variant="caption" color="ink2">
      {label}
    </AppText>
  </View>
)

// 팔로우 옆 "메시지": 대화를 만들거나(있으면 그대로) 대화방으로 이동 (맞팔이 아니면 상대 요청함으로 간다)
const MessageButton = ({ userId }: { userId: string }) => {
  const start = useStartConversation()
  return (
    <Button
      label="메시지"
      variant="secondary"
      size="md"
      style={styles.messageButton}
      isLoading={start.isPending}
      onPress={() => start.mutate(userId)}
    />
  )
}

const ProfileSummary = ({ profile, isMine }: { profile: UserProfile; isMine: boolean }) => (
  <View style={styles.summaryWrap}>
    <View style={styles.summary}>
      <Avatar name={profile.nickname} uri={profile.avatarUrl} size={84} />
      <View style={styles.stats}>
        <Stat label="게시물" value={profile.postCount} />
        <Stat label="팔로워" value={profile.followerCount} />
        <Stat label="팔로잉" value={profile.followingCount} />
      </View>
    </View>
    {profile.bio ? <AppText variant="callout">{profile.bio}</AppText> : null}
    {isMine ? null : (
      <View style={styles.buttons}>
        <FollowButton profile={profile} />
        <MessageButton userId={profile.id} />
      </View>
    )}
  </View>
)

const ProfileTabs = ({ tab, onChange }: { tab: ProfileTab; onChange: (tab: ProfileTab) => void }) => (
  <View accessibilityRole="tablist" style={styles.tabs}>
    {TABS.map(({ key, label }) => (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: tab === key }}
        onPress={() => onChange(key)}
        style={[styles.tab, tab === key ? styles.tabActive : null]}
      >
        <AppText variant={tab === key ? 'bodyStrong' : 'body'} color={tab === key ? 'ink' : 'ink3'}>
          {label}
        </AppText>
      </Pressable>
    ))}
  </View>
)

// 17 사용자 프로필: 카운트·소개·팔로우 + 게시물 / 반려동물 탭, … → 신고·차단(18)
const UserProfileScreen = ({ userId }: UserProfileScreenProps) => {
  const profile = useUserProfile(userId)
  const posts = useUserPosts(profile.data ? userId : undefined)
  const me = useMe()
  const createReport = useCreateReport()
  const blockUser = useBlockUser()
  const [isSheetVisible, setIsSheetVisible] = useState(false)
  const [tab, setTab] = useState<ProfileTab>('posts')
  // 반려동물 탭을 처음 열 때 조회한다
  const pets = useUserPets(profile.data && tab === 'pets' ? userId : undefined)
  const isMine = me.data?.id === userId

  const handleSubmitReport = async (reason: ReportReason) => {
    await createReport.mutateAsync({ targetType: 'USER', targetId: userId, reason })
  }
  const handleBlock = async () => {
    await blockUser.mutateAsync(userId)
  }
  // 차단을 마쳤다면 더 이상 볼 수 없는 프로필이므로 이전 화면으로 돌아간다
  const handleSheetClose = () => {
    setIsSheetVisible(false)
    if (blockUser.isSuccess && router.canGoBack()) router.back()
  }

  const moreButton =
    profile.data && !isMine ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="신고 또는 차단"
        onPress={() => setIsSheetVisible(true)}
        style={styles.iconButton}
      >
        <Icon name="more" color="ink2" />
      </Pressable>
    ) : null

  const items = posts.data?.pages.flatMap((page) => page.items) ?? []
  const emptyPosts = posts.isPending ? (
    <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  ) : (
    <AppText variant="callout" color="ink2" style={styles.emptyPosts}>
      아직 게시물이 없어요
    </AppText>
  )
  const emptyPets = pets.isPending ? (
    <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  ) : (
    <AppText variant="callout" color="ink2" style={styles.emptyPosts}>
      등록된 반려동물이 없어요
    </AppText>
  )
  const header = profile.data ? (
    <View>
      <ProfileSummary profile={profile.data} isMine={isMine} />
      <ProfileTabs tab={tab} onChange={setTab} />
    </View>
  ) : null

  return (
    <View style={styles.screen}>
      <AppHeader title={profile.data?.nickname} right={moreButton} />
      {profile.isPending ? <ActivityIndicator style={styles.loading} color={COLORS.primary} /> : null}
      {profile.isError ? (
        <EmptyLayout title="사용자를 찾을 수 없어요" description="탈퇴했거나 볼 수 없는 사용자예요." />
      ) : null}
      {profile.data && tab === 'pets' ? (
        <FlatList
          key="pets"
          data={pets.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserPetCard pet={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyPets}
        />
      ) : null}
      {profile.data && tab === 'posts' ? (
        <FlatList
          key="posts"
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <PostGridTile post={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyPosts}
          onEndReached={() => {
            if (posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage().catch(() => undefined)
          }}
        />
      ) : null}
      {profile.data ? (
        <ReportSheet
          isVisible={isSheetVisible}
          onClose={handleSheetClose}
          target={{ type: 'USER', id: profile.data.id }}
          author={{ id: profile.data.id, nickname: profile.data.nickname }}
          onSubmitReport={handleSubmitReport}
          onBlock={handleBlock}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  loading: { marginTop: SPACING.xxxl },
  iconButton: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  summaryWrap: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md + 2,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: GRID_GAP },
  tab: { flex: 1, height: TOUCH_TARGET + SPACING.xs, alignItems: 'center', justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.ink },
  summary: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg + 2 },
  stats: { flex: 1, flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18 },
  buttons: { flexDirection: 'row', gap: SPACING.sm },
  messageButton: { flex: 1 },
  gridRow: { gap: GRID_GAP },
  emptyPosts: { textAlign: 'center', marginTop: SPACING.xxl },
})

export default UserProfileScreen
