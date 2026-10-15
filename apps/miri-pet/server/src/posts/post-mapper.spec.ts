import { type PostRow, toPostDto } from './post-mapper'

const PLACE_ID = '0199e3a0-0000-7000-8000-000000000301'

const row = (place: PostRow['place']): PostRow => ({
  id: '0199e3a0-0000-7000-8000-000000000001',
  caption: '',
  likeCount: 0,
  commentCount: 0,
  createdAt: new Date('2026-10-15T00:00:00.000Z'),
  author: { id: '0199e3a0-0000-7000-8000-00000000000a', nickname: '에이', avatarMedia: null },
  images: [],
  pets: [],
  place,
})

describe('toPostDto 장소 태그', () => {
  it('태그 없음 → place null', () => {
    expect(toPostDto(row(null), false, 'https://img.test').place).toBeNull()
  })

  it('ACTIVE 장소 → { id, name, category }만 내보낸다', () => {
    const dto = toPostDto(row({ id: PLACE_ID, name: '숲길 카페', category: 'CAFE', status: 'ACTIVE' }), false, '')
    expect(dto.place).toEqual({ id: PLACE_ID, name: '숲길 카페', category: 'CAFE' })
  })

  it.each(['HIDDEN', 'CLOSED'] as const)('%s 장소 → place null', (status) => {
    expect(toPostDto(row({ id: PLACE_ID, name: '숲길 카페', category: 'CAFE', status }), false, '').place).toBeNull()
  })
})
