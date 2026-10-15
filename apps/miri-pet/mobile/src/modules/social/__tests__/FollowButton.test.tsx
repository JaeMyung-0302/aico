import type { UserProfile } from '@miri-pet/shared'
import { render, screen, userEvent } from '@testing-library/react-native'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { followUser, unfollowUser } from '../data-access-social/social-api'
import FollowButton from '../ui-follow-button/FollowButton'

jest.mock('../data-access-social/social-api', () => ({ followUser: jest.fn(), unfollowUser: jest.fn() }))

const PROFILE: UserProfile = {
  id: '0199e3a0-0000-7000-8000-000000000021',
  nickname: 'minsu_big3',
  avatarUrl: null,
  bio: null,
  followerCount: 10,
  followingCount: 3,
  postCount: 4,
  isFollowing: false,
}

const renderButton = (profile: UserProfile) =>
  render(
    <QueryTestProvider>
      <FollowButton profile={profile} />
    </QueryTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
})

describe('팔로우 버튼 (17)', () => {
  it('팔로우 → 서버 호출, 버튼이 "팔로잉"으로', async () => {
    jest.mocked(followUser).mockResolvedValue({ isFollowing: true })
    const user = userEvent.setup()
    await renderButton(PROFILE)
    await user.press(screen.getByRole('button', { name: '팔로우' }))
    expect(followUser).toHaveBeenCalledWith(PROFILE.id)
    expect(await screen.findByRole('button', { name: '팔로잉' })).toBeOnTheScreen()
  })

  it('팔로잉 상태에서 누르면 언팔로우', async () => {
    jest.mocked(unfollowUser).mockResolvedValue({ isFollowing: false })
    const user = userEvent.setup()
    await renderButton({ ...PROFILE, isFollowing: true })
    await user.press(screen.getByRole('button', { name: '팔로잉' }))
    expect(unfollowUser).toHaveBeenCalledWith(PROFILE.id)
    expect(await screen.findByRole('button', { name: '팔로우' })).toBeOnTheScreen()
  })

  it('실패하면 원래 상태로 돌아온다', async () => {
    jest.mocked(followUser).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    await renderButton(PROFILE)
    await user.press(screen.getByRole('button', { name: '팔로우' }))
    expect(await screen.findByRole('button', { name: '팔로우' })).toBeOnTheScreen()
  })
})
