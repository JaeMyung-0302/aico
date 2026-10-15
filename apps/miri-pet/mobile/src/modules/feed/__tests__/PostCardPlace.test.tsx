import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePost, testId } from '../__fixtures__/posts'
import PostCard from '../ui-post-card/PostCard'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))

const PLACE = { id: testId(301), name: '숲길 테라스 카페', category: 'CAFE' as const }

const renderCard = (post = makePost()) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PostCard post={post} isMine isDetail />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => jest.clearAllMocks())

describe('게시물 카드 장소 칩 (04·05)', () => {
  it('장소가 태그돼 있으면 칩을 보여주고, 누르면 장소 상세로', async () => {
    const user = userEvent.setup()
    await renderCard(makePost({ place: PLACE }))
    await user.press(screen.getByRole('link', { name: `장소 ${PLACE.name} 보기` }))
    expect(router.push).toHaveBeenCalledWith(`/places/${PLACE.id}`)
    expect(screen.getByText(PLACE.name)).toBeOnTheScreen()
  })

  it('장소가 없으면 칩이 없다', async () => {
    await renderCard(makePost({ place: null }))
    expect(screen.queryByRole('link', { name: /^장소 / })).toBeNull()
  })
})
