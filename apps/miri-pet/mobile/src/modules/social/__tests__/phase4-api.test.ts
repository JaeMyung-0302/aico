import {
  commentPageSchema,
  commentSchema,
  feedPageSchema,
  followResultSchema,
  likeResultSchema,
  notificationPageSchema,
  postPageSchema,
  postSchema,
  unreadCountSchema,
  userPageSchema,
} from '@miri-pet/shared'
import { fetchFeed } from '@/modules/feed/data-access-feed/feed-api'
import {
  fetchNotifications,
  fetchUnreadCount,
  readAllNotifications,
} from '@/modules/notifications/data-access-notifications/notifications-api'
import { createPost, deletePost, fetchPost, fetchUserPosts } from '@/modules/posts/data-access-posts/posts-api'
import { requestApi } from '@/shared/api/api-client'
import {
  createComment,
  deleteComment,
  fetchComments,
  fetchFollows,
  followUser,
  likePost,
  unfollowUser,
  unlikePost,
} from '../data-access-social/social-api'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

const ID = '01890a5d-ac96-774b-bcce-b302099a8057'
const CURSOR = '01890a5d-ac96-774b-bcce-b302099a8058'

beforeEach(() => jest.clearAllMocks())

// 화면이 기대는 엔드포인트·쿼리·응답 스키마 계약 (서버 Phase 4 컨트롤러와 1:1)
describe('Phase 4 API 계약', () => {
  it('피드: /feed/home|explore, 커서·excludeFollowing은 있을 때만 보낸다', async () => {
    await fetchFeed({ source: 'home', cursor: null })
    await fetchFeed({ source: 'explore', cursor: CURSOR, excludeFollowing: true })
    expect(requestApi).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      url: '/feed/home',
      params: {},
      schema: feedPageSchema,
    })
    expect(requestApi).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      url: '/feed/explore',
      params: { cursor: CURSOR, excludeFollowing: 'true' },
      schema: feedPageSchema,
    })
  })

  it('게시물: 상세·작성·삭제·프로필 그리드', async () => {
    await fetchPost(ID)
    await createPost({ caption: '', mediaIds: [ID], petIds: [ID] })
    await deletePost(ID)
    await fetchUserPosts(ID, CURSOR)
    expect(requestApi).toHaveBeenCalledWith({ method: 'GET', url: `/posts/${ID}`, schema: postSchema })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/posts',
      data: { caption: '', mediaIds: [ID], petIds: [ID] },
      schema: postSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({ method: 'DELETE', url: `/posts/${ID}` })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: `/users/${ID}/posts`,
      params: { cursor: CURSOR },
      schema: postPageSchema,
    })
  })

  it('좋아요 PUT/DELETE, 댓글 목록·작성·삭제', async () => {
    await likePost(ID)
    await unlikePost(ID)
    await fetchComments(ID, null)
    await createComment(ID, '안녕')
    await deleteComment(ID)
    expect(requestApi).toHaveBeenCalledWith({ method: 'PUT', url: `/posts/${ID}/like`, schema: likeResultSchema })
    expect(requestApi).toHaveBeenCalledWith({ method: 'DELETE', url: `/posts/${ID}/like`, schema: likeResultSchema })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: `/posts/${ID}/comments`,
      params: {},
      schema: commentPageSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: `/posts/${ID}/comments`,
      data: { body: '안녕' },
      schema: commentSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({ method: 'DELETE', url: `/comments/${ID}` })
  })

  it('팔로우 PUT/DELETE, 팔로워·팔로잉 목록', async () => {
    await followUser(ID)
    await unfollowUser(ID)
    await fetchFollows(ID, 'followers', CURSOR)
    expect(requestApi).toHaveBeenCalledWith({ method: 'PUT', url: `/users/${ID}/follow`, schema: followResultSchema })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'DELETE',
      url: `/users/${ID}/follow`,
      schema: followResultSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: `/users/${ID}/followers`,
      params: { cursor: CURSOR },
      schema: userPageSchema,
    })
  })

  it('알림: 목록·안 읽음 수·모두 읽음', async () => {
    await fetchNotifications(null)
    await fetchUnreadCount()
    await readAllNotifications()
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: '/notifications',
      params: {},
      schema: notificationPageSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: '/notifications/unread-count',
      schema: unreadCountSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({ method: 'POST', url: '/notifications/read-all' })
  })
})
