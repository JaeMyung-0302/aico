import type { PublicPet, UserProfile } from '@miri-pet/shared'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { makePost } from '@/modules/feed/__fixtures__/posts'
import { openConversation } from '@/modules/dm/data-access-dm/dm-api'
import { blockUser, unblockUser } from '@/modules/moderation/data-access-moderation/moderation-api'
import { fetchUserPets } from '@/modules/pets/data-access-pets/pets-api'
import { fetchUserPosts } from '@/modules/posts/data-access-posts/posts-api'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import UserProfileScreen from '../feature-user-profile/UserProfileScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('@/modules/dm/data-access-dm/dm-api', () => ({ openConversation: jest.fn() }))
jest.mock('@/modules/posts/data-access-posts/posts-api', () => ({ fetchUserPosts: jest.fn(), deletePost: jest.fn() }))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchUserPets: jest.fn() }))
jest.mock('@/modules/moderation/data-access-moderation/moderation-api', () => ({
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  createReport: jest.fn(),
}))
const mockFetchProfile = jest.fn()
jest.mock('@/modules/user/data-access-user/useUserProfile', () => {
  const { useQuery } = jest.requireActual('@tanstack/react-query')
  return {
    userProfileQueryKey: (userId: string) => ['users', userId],
    useUserProfile: (userId: string) =>
      useQuery({ queryKey: ['users', userId], queryFn: () => mockFetchProfile(userId) }),
  }
})
jest.mock('@/modules/user/data-access-me/useMe', () => ({ useMe: () => ({ data: { id: ME } }) }))

const ME = '0199e3a0-0000-7000-8000-0000000000aa'
const PROFILE: UserProfile = {
  id: '0199e3a0-0000-7000-8000-000000000021',
  nickname: 'minsu_big3',
  avatarUrl: null,
  bio: '대형견 셋과 사는 집',
  followerCount: 128,
  followingCount: 87,
  postCount: 2,
  isFollowing: false,
}
const POSTS = [makePost({ author: PROFILE }), makePost({ author: PROFILE })]
const PETS: PublicPet[] = [
  {
    id: '0199e3a0-0000-7000-8000-000000000031',
    name: '보리',
    species: 'DOG',
    breed: '골든 리트리버',
    size: 'L',
    birthYear: 2020,
    avatarUrl: null,
  },
  {
    id: '0199e3a0-0000-7000-8000-000000000032',
    name: '콩이',
    species: 'DOG',
    breed: null,
    size: 'M',
    birthYear: null,
    avatarUrl: null,
  },
]

const renderScreen = (userId: string) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <UserProfileScreen userId={userId} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchProfile.mockResolvedValue(PROFILE)
  jest.mocked(fetchUserPosts).mockResolvedValue({ items: POSTS, nextCursor: null })
  jest.mocked(fetchUserPets).mockResolvedValue({ items: PETS })
})

describe('사용자 프로필 (17)', () => {
  it('카운트·소개·팔로우 버튼·게시물 그리드, 그리드를 누르면 게시물로', async () => {
    const user = userEvent.setup()
    await renderScreen(PROFILE.id)
    expect(await screen.findByLabelText('팔로워 128')).toBeOnTheScreen()
    expect(screen.getByText('대형견 셋과 사는 집')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '팔로우' })).toBeOnTheScreen()
    const tiles = await screen.findAllByRole('button', { name: /게시물 보기/ })
    expect(tiles).toHaveLength(2)
    await user.press(tiles[0]!)
    expect(router.push).toHaveBeenCalledWith(`/posts/${POSTS[0]!.id}`)
    expect(fetchUserPosts).toHaveBeenCalledWith(PROFILE.id, null)
  })

  it('메시지 버튼 → 대화를 열고(있으면 그대로) 대화방으로 이동', async () => {
    const user = userEvent.setup()
    const conversationId = '0199e3a0-0000-7000-8000-000000000950'
    jest.mocked(openConversation).mockResolvedValue({
      id: conversationId,
      peer: { id: PROFILE.id, nickname: PROFILE.nickname, avatarUrl: null },
      state: 'ACCEPTED',
      lastMessage: null,
      unreadCount: 0,
      peerLastReadMessageId: null,
    })
    await renderScreen(PROFILE.id)
    await user.press(await screen.findByRole('button', { name: '메시지' }))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/dm/${conversationId}`))
    expect(openConversation).toHaveBeenCalledWith(PROFILE.id)
  })

  it('내 프로필에는 팔로우·신고 버튼이 없다', async () => {
    mockFetchProfile.mockResolvedValue({ ...PROFILE, id: ME })
    await renderScreen(ME)
    await screen.findByLabelText('팔로워 128')
    expect(screen.queryByRole('button', { name: '팔로우' })).toBeNull()
    expect(screen.queryByRole('button', { name: '신고 또는 차단' })).toBeNull()
    expect(screen.queryByRole('button', { name: '메시지' })).toBeNull()
  })

  it('게시물이 없으면 안내', async () => {
    jest.mocked(fetchUserPosts).mockResolvedValue({ items: [], nextCursor: null })
    await renderScreen(PROFILE.id)
    expect(await screen.findByText('아직 게시물이 없어요')).toBeOnTheScreen()
  })

  it('차단·탈퇴 등으로 볼 수 없으면(404) 안내', async () => {
    mockFetchProfile.mockRejectedValue(new ApiError({ code: 'HTTP', status: 404, message: 'x' }))
    await renderScreen(PROFILE.id)
    expect(await screen.findByText('사용자를 찾을 수 없어요')).toBeOnTheScreen()
  })

  it('게시물 / 반려동물 탭: 반려동물 탭을 누르면 펫 카드(이름·품종 · 크기)를 보여주고 그리드는 숨긴다', async () => {
    const user = userEvent.setup()
    await renderScreen(PROFILE.id)
    const postsTab = await screen.findByRole('tab', { name: '게시물' })
    expect(postsTab).toBeSelected()
    expect(await screen.findAllByRole('button', { name: /게시물 보기/ })).toHaveLength(2)
    expect(fetchUserPets).not.toHaveBeenCalled()

    await user.press(screen.getByRole('tab', { name: '반려동물' }))

    expect(screen.getByRole('tab', { name: '반려동물' })).toBeSelected()
    expect(await screen.findByText('보리')).toBeOnTheScreen()
    expect(screen.getByText('골든 리트리버 · 대형')).toBeOnTheScreen()
    expect(screen.getByText('콩이')).toBeOnTheScreen()
    expect(screen.getByText('중형')).toBeOnTheScreen()
    expect(screen.queryAllByRole('button', { name: /게시물 보기/ })).toHaveLength(0)
    expect(fetchUserPets).toHaveBeenCalledWith(PROFILE.id)

    await user.press(screen.getByRole('tab', { name: '게시물' }))
    expect(await screen.findAllByRole('button', { name: /게시물 보기/ })).toHaveLength(2)
  })

  it('반려동물이 없으면 안내', async () => {
    const user = userEvent.setup()
    jest.mocked(fetchUserPets).mockResolvedValue({ items: [] })
    await renderScreen(PROFILE.id)
    await user.press(await screen.findByRole('tab', { name: '반려동물' }))
    expect(await screen.findByText('등록된 반려동물이 없어요')).toBeOnTheScreen()
  })
})

describe('차단 / 차단 해제', () => {
  const NOT_FOUND = new ApiError({ code: 'HTTP', status: 404, message: 'x' })

  const blockFromMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.press(await screen.findByRole('button', { name: '신고 또는 차단' }))
    await user.press(await screen.findByRole('button', { name: `${PROFILE.nickname} 님 차단` }))
    await user.press(await screen.findByRole('button', { name: '차단하기' }))
    await user.press(await screen.findByRole('button', { name: '확인' }))
  }

  beforeEach(() => {
    jest.mocked(blockUser).mockImplementation(async () => {
      // 차단하면 서버가 프로필을 404로 숨긴다
      mockFetchProfile.mockRejectedValue(NOT_FOUND)
    })
    jest.mocked(unblockUser).mockImplementation(async () => {
      mockFetchProfile.mockResolvedValue(PROFILE)
    })
  })

  it('차단하면 팔로우·메시지·"찾을 수 없어요" 없이 차단 상태 하나만 보여 주고 화면에 머문다', async () => {
    const user = userEvent.setup()
    await renderScreen(PROFILE.id)
    await blockFromMenu(user)

    expect(await screen.findByText('차단한 사용자예요')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '차단 해제' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '팔로우' })).toBeNull()
    expect(screen.queryByRole('button', { name: '메시지' })).toBeNull()
    expect(screen.queryByText('사용자를 찾을 수 없어요')).toBeNull()
    expect(screen.queryByRole('button', { name: '신고 또는 차단' })).toBeNull()
    expect(router.back).not.toHaveBeenCalled()
    expect(blockUser).toHaveBeenCalledWith(PROFILE.id)
  })

  it('차단 해제하면 다시 일반 프로필로 돌아온다', async () => {
    const user = userEvent.setup()
    await renderScreen(PROFILE.id)
    await blockFromMenu(user)
    await user.press(await screen.findByRole('button', { name: '차단 해제' }))

    expect(await screen.findByRole('button', { name: '팔로우' })).toBeOnTheScreen()
    expect(unblockUser).toHaveBeenCalledWith(PROFILE.id)
    expect(screen.queryByText('차단한 사용자예요')).toBeNull()
    expect(screen.queryByText('사용자를 찾을 수 없어요')).toBeNull()
  })

  it('차단 해제에 실패하면 차단 상태에 머물며 알린다', async () => {
    jest.mocked(unblockUser).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen(PROFILE.id)
    await blockFromMenu(user)
    await user.press(await screen.findByRole('button', { name: '차단 해제' }))

    expect(await screen.findByText('차단을 풀지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(screen.getByText('차단한 사용자예요')).toBeOnTheScreen()
  })
})
